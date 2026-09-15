package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.dto.DashboardActionRequest;
import com.authapp.dto.DashboardActionResponse;
import com.authapp.dto.DashboardRecentLogDTO;
import com.authapp.dto.DashboardStatsDTO;
import com.authapp.entity.Batch;
import com.authapp.entity.Customer;
import com.authapp.entity.Event;
import com.authapp.entity.EventType;
import com.authapp.entity.Sale;
import com.authapp.entity.User;
import com.authapp.entity.Role;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.CustomerRepository;
import com.authapp.repository.EventRepository;
import com.authapp.repository.EventTypeRepository;
import com.authapp.repository.SaleRepository;
import com.authapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class DashboardService {

    private static final Set<String> SUPPORTED_ACTIONS = Set.of(
            "MORTALITY",
            "FEEDING",
            "VACCINATION",
            "HEALTH_CHECK",
            "SALE"
    );

    private final BatchRepository batchRepository;
    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final EventService eventService;
    private final EventLogger eventLogger;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'dashboard-stats-' + #userId")
    public DashboardStatsDTO getDashboardStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
        boolean admin = user.getRole() == Role.ROLE_ADMIN;

        return DashboardStatsDTO.builder()
                .totalLivestock(defaultLong(admin
                        ? batchRepository.sumCurrentCount()
                        : batchRepository.sumCurrentCountByUserId(userId)))
                .activeBatchCount(defaultLong(admin
                        ? batchRepository.countActiveBatches()
                        : batchRepository.countActiveBatchesByUserId(userId)))
                .todayActionCount(defaultLong(
                        eventRepository.countByUserIdAndCreatedAtSince(userId, LocalDateTime.now().minusHours(24))
                ))
                .availableBatches(admin
                        ? batchRepository.findDashboardBatchOptions()
                        : batchRepository.findDashboardBatchOptionsByUserId(userId))
                .build();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'dashboard-recent-logs-' + #userId")
    public List<DashboardRecentLogDTO> getRecentLogs(Long userId) {
        return eventRepository.findRecentDashboardLogsByUserId(userId, PageRequest.of(0, 8));
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public DashboardActionResponse logAction(Long userId, DashboardActionRequest request, String ipAddress) {
        String actionType = normalizeActionType(request.getActionType());
        if (!SUPPORTED_ACTIONS.contains(actionType)) {
            throw new IllegalArgumentException("Unsupported dashboard action: " + request.getActionType());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found."));

        Batch batch = batchRepository.findById(request.getBatchId())
                .orElseThrow(() -> new IllegalArgumentException("Batch not found."));

        boolean admin = user.getRole() == Role.ROLE_ADMIN;
        if (!admin && (batch.getUser() == null
                || batch.getUser().getId() == null
                || !batch.getUser().getId().equals(userId))) {
            throw new AccessDeniedException("You do not have permission to log activity for this batch.");
        }

        String operationId = cleanOperationId(request.getOperationId());
        if (operationId != null) {
            Event existingEvent = eventRepository.findByIdempotencyKey(operationId).orElse(null);
            if (existingEvent != null) {
                if (!sameRequestedAction(existingEvent, batch, userId, actionType, request)) {
                    throw new IllegalArgumentException("The operation identifier is already used for another action.");
                }
                Sale existingSale = existingEvent.getSale();
                return buildActionResponse(
                        existingEvent,
                        existingSale != null ? existingSale.getId() : null,
                        existingSale != null && existingSale.getCustomer() != null ? existingSale.getCustomer().getName() : null,
                        existingSale != null ? existingSale.getUnitPrice() : null,
                        existingSale != null ? existingSale.getTotalAmount() : null
                );
            }
        }

        if ("SALE".equals(actionType)) {
            return logSaleAction(userId, user, batch, request, ipAddress, operationId);
        }

        EventType eventType = eventTypeRepository.findByCode(actionType)
                .orElseThrow(() -> new IllegalArgumentException("Event type not found: " + actionType));

        Event event = Event.builder()
                .quantity(request.getQuantity())
                .unit(resolveUnit(actionType))
                .measuredQuantity(resolveMeasuredQuantity(actionType, request))
                .remarks(cleanRemarks(request.getRemarks()))
                .batch(batch)
                .eventType(eventType)
                .user(user)
                .idempotencyKey(operationId)
                .build();

        Event savedEvent = eventService.createEvent(event);
        eventLogger.logActivity(
                userId,
                buildHandlerActionMessage(actionType, savedEvent.getQuantity(), savedEvent.getMeasuredQuantity(), batch.getName()),
                batch.getId(),
                ipAddress
        );

        return buildActionResponse(savedEvent, null, null, null, null);
    }

    private String normalizeActionType(String actionType) {
        if (actionType == null) {
            return "";
        }

        return switch (actionType.trim().toUpperCase(Locale.ROOT)) {
            case "SALES" -> "SALE";
            case "MEDICINE" -> "VACCINATION";
            default -> actionType.trim().toUpperCase(Locale.ROOT);
        };
    }

    private String resolveUnit(String actionType) {
        return switch (actionType) {
            case "FEEDING" -> "kg";
            case "VACCINATION" -> "dose";
            case "HEALTH_CHECK" -> "inspection";
            case "SALE" -> "head";
            default -> "head";
        };
    }

    private DashboardActionResponse logSaleAction(
            Long userId,
            User user,
            Batch batch,
            DashboardActionRequest request,
            String ipAddress,
            String operationId
    ) {
        String customerName = cleanCustomerName(request.getCustomerName());
        Double unitPrice = cleanUnitPrice(request.getUnitPrice());
        Double totalAmount = calculateTotalAmount(unitPrice, request.getQuantity());

        Customer customer = customerRepository.findByNameIgnoreCase(customerName)
                .orElseGet(() -> customerRepository.save(Customer.builder()
                        .name(customerName)
                        .build()));

        Sale sale = Sale.builder()
                .unitPrice(unitPrice)
                .quantity(request.getQuantity())
                .totalAmount(totalAmount)
                .customer(customer)
                .batch(batch)
                .user(user)
                .build();

        Sale savedSale = saleRepository.save(sale);

        EventType eventType = eventTypeRepository.findByCode("SALE")
                .orElseThrow(() -> new IllegalArgumentException("Event type not found: SALE"));

        Event saleEvent = Event.builder()
                .quantity(request.getQuantity())
                .unit(resolveUnit("SALE"))
                .remarks(buildSaleRemarks(customerName, unitPrice, totalAmount, request.getRemarks()))
                .batch(batch)
                .eventType(eventType)
                .user(user)
                .sale(savedSale)
                .idempotencyKey(operationId)
                .build();

        Event savedEvent = eventService.createEvent(saleEvent);
        eventLogger.logActivity(
                userId,
                buildSaleActionMessage(savedEvent.getQuantity(), batch.getName(), customerName),
                batch.getId(),
                ipAddress
        );

        return buildActionResponse(savedEvent, savedSale.getId(), customerName, unitPrice, totalAmount);
    }

    private String cleanRemarks(String remarks) {
        if (remarks == null) {
            return null;
        }

        String trimmed = remarks.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String cleanCustomerName(String customerName) {
        if (customerName == null || customerName.trim().isEmpty()) {
            throw new IllegalArgumentException("Customer name is required for sales.");
        }

        return customerName.trim();
    }

    private Double cleanUnitPrice(Double unitPrice) {
        if (unitPrice == null || unitPrice <= 0) {
            throw new IllegalArgumentException("Unit price must be greater than 0 for sales.");
        }

        return BigDecimal.valueOf(unitPrice)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private Double calculateTotalAmount(Double unitPrice, Integer quantity) {
        return BigDecimal.valueOf(unitPrice)
                .multiply(BigDecimal.valueOf(quantity.longValue()))
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String buildSaleRemarks(String customerName, Double unitPrice, Double totalAmount, String remarks) {
        StringBuilder builder = new StringBuilder();
        builder.append("Customer: ").append(customerName)
                .append(" | Unit Price: ").append(String.format(Locale.US, "%.2f", unitPrice))
                .append(" | Total Amount: ").append(String.format(Locale.US, "%.2f", totalAmount));

        String cleanedRemarks = cleanRemarks(remarks);
        if (cleanedRemarks != null) {
            builder.append(" | Notes: ").append(cleanedRemarks);
        }

        return builder.toString();
    }

    private String buildHandlerActionMessage(String actionType, Integer quantity, BigDecimal measuredQuantity, String batchName) {
        return switch (actionType) {
            case "FEEDING" -> truncateAction(String.format(
                    "Logged feeding %.2f kg for %s",
                    measuredQuantity != null ? measuredQuantity.doubleValue() : quantity.doubleValue(),
                    batchName
            ));
            case "MORTALITY" -> truncateAction(String.format("Logged %d mortality for %s", quantity, batchName));
            case "VACCINATION" -> truncateAction(String.format("Logged %d medicine for %s", quantity, batchName));
            case "HEALTH_CHECK" -> truncateAction(String.format("Logged health check for %s", batchName));
            default -> truncateAction(String.format("Logged %s for %s", actionType, batchName));
        };
    }

    private String buildSaleActionMessage(Integer quantity, String batchName, String customerName) {
        return truncateAction(String.format("Sold %d head from %s to %s", quantity, batchName, customerName));
    }

    private String truncateAction(String action) {
        if (action == null) {
            return null;
        }

        return action.length() <= 100 ? action : action.substring(0, 100);
    }

    private DashboardActionResponse buildActionResponse(
            Event savedEvent,
            Long saleId,
            String customerName,
            Double unitPrice,
            Double totalAmount
    ) {
        Batch updatedBatch = savedEvent.getBatch();

        return DashboardActionResponse.builder()
                .eventId(savedEvent.getId())
                .saleId(saleId)
                .actionType(savedEvent.getEventType().getCode())
                .batchId(updatedBatch.getId())
                .batchName(updatedBatch.getName())
                .quantity(savedEvent.getQuantity())
                .measuredQuantity(savedEvent.getMeasuredQuantity())
                .customerName(customerName)
                .unitPrice(unitPrice)
                .totalAmount(totalAmount)
                .updatedCurrentCount(updatedBatch.getCurrentCount())
                .timestamp(savedEvent.getCreatedAt())
                .operationId(savedEvent.getIdempotencyKey())
                .status(savedEvent.getStatus())
                .correctionOfId(savedEvent.getCorrectionOf() != null ? savedEvent.getCorrectionOf().getId() : null)
                .build();
    }

    private String cleanOperationId(String operationId) {
        if (operationId == null || operationId.isBlank()) {
            return null;
        }
        return operationId.trim();
    }

    private BigDecimal resolveMeasuredQuantity(String actionType, DashboardActionRequest request) {
        if (!"FEEDING".equals(actionType)) {
            return null;
        }

        BigDecimal measured = request.getMeasuredQuantity();
        if (measured == null) {
            measured = BigDecimal.valueOf(request.getQuantity());
        }
        if (measured.signum() <= 0) {
            throw new IllegalArgumentException("Measured feed quantity must be greater than 0.");
        }
        return measured.setScale(4, RoundingMode.HALF_UP);
    }

    private boolean sameRequestedAction(
            Event existingEvent,
            Batch requestedBatch,
            Long userId,
            String actionType,
            DashboardActionRequest request
    ) {
        Long existingUserId = existingEvent.getUser() != null ? existingEvent.getUser().getId() : null;
        return existingEvent.getBatch() != null
                && requestedBatch.getId().equals(existingEvent.getBatch().getId())
                && userId.equals(existingUserId)
                && actionType.equals(existingEvent.getEventType().getCode())
                && request.getQuantity().equals(existingEvent.getQuantity())
                && ("FEEDING".equals(actionType)
                    ? java.util.Objects.equals(resolveMeasuredQuantity(actionType, request), existingEvent.getMeasuredQuantity())
                    : existingEvent.getMeasuredQuantity() == null);
    }

    private Long defaultLong(Long value) {
        return value != null ? value : 0L;
    }
}
