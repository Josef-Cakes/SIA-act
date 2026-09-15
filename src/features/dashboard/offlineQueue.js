const DB_NAME = 'farmville-field-outbox';
const STORE_NAME = 'operations';
const DB_VERSION = 1;
const FALLBACK_KEY = 'farmville.field.outbox';

let databasePromise;
let flushInProgress = false;
let sender;

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function readFallbackQueue() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFallbackQueue(queue) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(queue));
  }
}

function openDatabase() {
  if (!hasIndexedDb()) return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'operationId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open offline storage.'));
  }).catch(() => null);

  return databasePromise;
}

export async function enqueueOperation(payload) {
  const operation = {
    operationId: payload.operationId,
    payload,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  const db = await openDatabase();

  if (!db) {
    const queue = readFallbackQueue().filter((item) => item.operationId !== operation.operationId);
    queue.push(operation);
    writeFallbackQueue(queue);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farm:operation-pending', { detail: operation }));
    }
    return operation;
  }

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(operation);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('farm:operation-pending', { detail: operation }));
  }
  return operation;
}

async function listOperations() {
  const db = await openDatabase();
  if (!db) return readFallbackQueue();

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }).catch(() => []);
}

async function removeOperation(operationId) {
  const db = await openDatabase();
  if (!db) {
    writeFallbackQueue(readFallbackQueue().filter((item) => item.operationId !== operationId));
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(operationId);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function updateAttempts(operation) {
  return { ...operation, attempts: (operation.attempts || 0) + 1, lastAttemptAt: new Date().toISOString() };
}

async function saveOperation(operation) {
  const db = await openDatabase();
  if (!db) {
    const queue = readFallbackQueue().map((item) => item.operationId === operation.operationId ? operation : item);
    writeFallbackQueue(queue);
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(operation);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function flushOfflineOperations() {
  if (flushInProgress || !sender || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return;
  }

  flushInProgress = true;
  try {
    const operations = await listOperations();
    for (const operation of operations) {
      try {
        await sender(operation.payload);
        await removeOperation(operation.operationId);
        window.dispatchEvent(new CustomEvent('farm:operation-synced', {
          detail: { operationId: operation.operationId },
        }));
      } catch (error) {
        // Keep the operation for a later retry only for transport failures.
        // Validation, authorization, and stock conflicts need user review.
        if (!error?.response) {
          await saveOperation(updateAttempts(operation));
          break;
        }

        await removeOperation(operation.operationId);
        window.dispatchEvent(new CustomEvent('farm:operation-failed', {
          detail: {
            operationId: operation.operationId,
            message: error?.response?.data?.message || 'The saved field action needs review.',
          },
        }));
      }
    }
  } finally {
    flushInProgress = false;
  }
}

export function configureOfflineSync(operationSender) {
  sender = operationSender;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', flushOfflineOperations);
    void flushOfflineOperations();
  }
}

export function pendingOperationResponse(payload) {
  return {
    success: true,
    message: 'Saved on this device. It will synchronize when the connection returns.',
    data: {
      operationId: payload.operationId,
      pendingSync: true,
      actionType: payload.actionType,
      batchId: payload.batchId,
      quantity: payload.quantity,
    },
  };
}
