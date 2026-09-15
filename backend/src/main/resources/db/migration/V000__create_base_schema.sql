-- Initial schema for a fresh database. Existing installations can baseline
-- at version 3 and apply V004 directly (see application-prod.properties).

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_image BYTEA,
    profile_image_type VARCHAR(50),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS livestock (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    affects_count BOOLEAN NOT NULL DEFAULT TRUE,
    count_sign INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    number VARCHAR(255),
    address VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    initial_count INTEGER NOT NULL,
    current_count INTEGER NOT NULL,
    status VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id BIGINT REFERENCES users(id),
    livestock_id BIGINT NOT NULL REFERENCES livestock(id)
);

CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    unit_price DOUBLE PRECISION,
    quantity INTEGER,
    total_weight DOUBLE PRECISION,
    total_amount DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_id BIGINT REFERENCES customers(id),
    batch_id BIGINT REFERENCES batches(id),
    user_id BIGINT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    quantity INTEGER NOT NULL,
    unit VARCHAR(255),
    remarks VARCHAR(255),
    quantity_change INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type_id BIGINT NOT NULL REFERENCES event_types(id),
    batch_id BIGINT NOT NULL REFERENCES batches(id),
    user_id BIGINT REFERENCES users(id),
    sale_id BIGINT REFERENCES sales(id)
);
