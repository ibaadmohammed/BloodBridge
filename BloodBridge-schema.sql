
-- ============================================
-- BLOODBRIDGE DATABASE
-- PostgreSQL 18
-- ============================================

-- 1. USER ROLES
CREATE TABLE IF NOT EXISTS roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

INSERT INTO roles (role_name, description)
VALUES
('admin', 'System administrator'),
('donor', 'Blood donor'),
('recipient', 'Blood recipient'),
('hospital', 'Hospital representative'),
('staff', 'Hospital staff')
ON CONFLICT (role_name) DO NOTHING;


-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id BIGINT REFERENCES roles(role_id),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. USER SESSIONS
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 4. ADDRESSES
CREATE TABLE IF NOT EXISTS addresses (
    address_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    hospital_id BIGINT,
    address_line TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(15),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);


-- 5. DONOR PROFILES
CREATE TABLE IF NOT EXISTS donor_profiles (
    donor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    blood_group VARCHAR(3) NOT NULL,
    weight_kg DECIMAL(5,2),
    last_donation_date DATE,
    total_donations INTEGER DEFAULT 0,
    availability_status VARCHAR(30) DEFAULT 'available',
    preferred_donation_type VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (weight_kg IS NULL OR weight_kg > 0),
    CHECK (total_donations >= 0),
    CHECK (availability_status IN ('available', 'unavailable', 'temporarily_deferred'))
);


-- 6. DONOR MEDICAL SCREENINGS
CREATE TABLE IF NOT EXISTS donor_medical_screenings (
    screening_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id BIGINT NOT NULL REFERENCES donor_profiles(donor_id),
    screening_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hemoglobin DECIMAL(5,2),
    blood_pressure VARCHAR(20),
    temperature DECIMAL(4,2),
    medical_conditions TEXT,
    medications TEXT,
    eligibility_status VARCHAR(30) DEFAULT 'pending',
    reviewed_by BIGINT REFERENCES users(user_id),
    notes TEXT,
    CHECK (eligibility_status IN ('pending', 'eligible', 'deferred'))
);


-- 7. HOSPITALS
CREATE TABLE IF NOT EXISTS hospitals (
    hospital_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    email VARCHAR(150),
    phone VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(15),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 8. HOSPITAL STAFF
CREATE TABLE IF NOT EXISTS hospital_staff (
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_id BIGINT NOT NULL REFERENCES hospitals(hospital_id),
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    designation VARCHAR(100),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, user_id)
);


-- 9. BLOOD GROUPS
CREATE TABLE IF NOT EXISTS blood_groups (
    blood_group_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_name VARCHAR(3) UNIQUE NOT NULL
);

INSERT INTO blood_groups (group_name)
VALUES ('A+'), ('A-'), ('B+'), ('B-'),
       ('AB+'), ('AB-'), ('O+'), ('O-')
ON CONFLICT (group_name) DO NOTHING;


-- 10. BLOOD COMPONENTS
CREATE TABLE IF NOT EXISTS blood_components (
    component_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    component_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    storage_days INTEGER,
    CHECK (storage_days IS NULL OR storage_days > 0)
);

INSERT INTO blood_components (component_name, description, storage_days)
VALUES
('Whole Blood', 'Whole blood collection', 35),
('Red Blood Cells', 'Packed red blood cells', 42),
('Platelets', 'Platelet component', 5),
('Plasma', 'Fresh frozen plasma', 365),
('Cryoprecipitate', 'Cryoprecipitated plasma component', 365)
ON CONFLICT (component_name) DO NOTHING;


-- 11. BLOOD INVENTORY
CREATE TABLE IF NOT EXISTS blood_inventory (
    inventory_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hospital_id BIGINT NOT NULL REFERENCES hospitals(hospital_id),
    blood_group_id BIGINT NOT NULL REFERENCES blood_groups(blood_group_id),
    component_id BIGINT NOT NULL REFERENCES blood_components(component_id),
    units_available INTEGER DEFAULT 0,
    units_reserved INTEGER DEFAULT 0,
    collection_date DATE,
    expiry_date DATE,
    storage_location VARCHAR(100),
    inventory_status VARCHAR(30) DEFAULT 'available',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (units_available >= 0),
    CHECK (units_reserved >= 0),
    CHECK (expiry_date IS NULL OR collection_date IS NULL OR expiry_date >= collection_date)
);


-- 12. INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
    transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES blood_inventory(inventory_id),
    transaction_type VARCHAR(30) NOT NULL,
    quantity INTEGER NOT NULL,
    reference_note TEXT,
    performed_by BIGINT REFERENCES users(user_id),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (transaction_type IN ('addition', 'reservation', 'release', 'issue', 'expiry', 'adjustment')),
    CHECK (quantity > 0)
);


-- 13. BLOOD REQUESTS
CREATE TABLE IF NOT EXISTS blood_requests (
    request_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requested_by BIGINT NOT NULL REFERENCES users(user_id),
    hospital_id BIGINT REFERENCES hospitals(hospital_id),
    patient_name VARCHAR(150) NOT NULL,
    patient_age INTEGER,
    blood_group_id BIGINT NOT NULL REFERENCES blood_groups(blood_group_id),
    units_required INTEGER NOT NULL,
    urgency VARCHAR(30) DEFAULT 'normal',
    request_status VARCHAR(30) DEFAULT 'pending',
    required_by TIMESTAMP,
    medical_reason TEXT,
    contact_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (patient_age IS NULL OR patient_age BETWEEN 0 AND 120),
    CHECK (units_required > 0),
    CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
    CHECK (request_status IN ('pending', 'approved', 'partially_fulfilled', 'fulfilled', 'rejected', 'cancelled'))
);


-- 14. BLOOD REQUEST ITEMS
CREATE TABLE IF NOT EXISTS blood_request_items (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    component_id BIGINT NOT NULL REFERENCES blood_components(component_id),
    units_requested INTEGER NOT NULL,
    units_fulfilled INTEGER DEFAULT 0,
    CHECK (units_requested > 0),
    CHECK (units_fulfilled >= 0 AND units_fulfilled <= units_requested)
);


-- 15. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id BIGINT NOT NULL REFERENCES donor_profiles(donor_id),
    hospital_id BIGINT NOT NULL REFERENCES hospitals(hospital_id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_status VARCHAR(30) DEFAULT 'scheduled',
    donation_type VARCHAR(30) DEFAULT 'whole_blood',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (appointment_status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'))
);


-- 16. DONATIONS
CREATE TABLE IF NOT EXISTS donations (
    donation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id BIGINT UNIQUE REFERENCES appointments(appointment_id),
    donor_id BIGINT NOT NULL REFERENCES donor_profiles(donor_id),
    hospital_id BIGINT NOT NULL REFERENCES hospitals(hospital_id),
    blood_group_id BIGINT NOT NULL REFERENCES blood_groups(blood_group_id),
    component_id BIGINT REFERENCES blood_components(component_id),
    quantity_ml INTEGER,
    donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    donation_status VARCHAR(30) DEFAULT 'collected',
    collected_by BIGINT REFERENCES users(user_id),
    notes TEXT,
    CHECK (quantity_ml IS NULL OR quantity_ml > 0),
    CHECK (donation_status IN ('collected', 'tested', 'approved', 'rejected'))
);


-- 17. DONATION TESTS
CREATE TABLE IF NOT EXISTS donation_tests (
    test_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donation_id BIGINT NOT NULL REFERENCES donations(donation_id) ON DELETE CASCADE,
    test_name VARCHAR(150) NOT NULL,
    test_result VARCHAR(100),
    result_status VARCHAR(30) DEFAULT 'pending',
    tested_by BIGINT REFERENCES users(user_id),
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    CHECK (result_status IN ('pending', 'passed', 'failed', 'inconclusive'))
);


-- 18. DONATION REACTIONS
CREATE TABLE IF NOT EXISTS donation_reactions (
    reaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donation_id BIGINT NOT NULL REFERENCES donations(donation_id),
    reaction_type VARCHAR(100),
    severity VARCHAR(30),
    description TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_taken TEXT
);


-- 19. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    description TEXT,
    organizer_id BIGINT REFERENCES users(user_id),
    hospital_id BIGINT REFERENCES hospitals(hospital_id),
    venue TEXT,
    city VARCHAR(100),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    campaign_status VARCHAR(30) DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date),
    CHECK (campaign_status IN ('upcoming', 'active', 'completed', 'cancelled'))
);


-- 20. CAMPAIGN REGISTRATIONS
CREATE TABLE IF NOT EXISTS campaign_registrations (
    registration_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    donor_id BIGINT NOT NULL REFERENCES donor_profiles(donor_id),
    registration_status VARCHAR(30) DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, donor_id),
    CHECK (registration_status IN ('registered', 'attended', 'cancelled'))
);


-- 21. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 22. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS notification_preferences (
    preference_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    emergency_alerts BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 23. EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS emergency_contacts (
    contact_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    donor_id BIGINT NOT NULL REFERENCES donor_profiles(donor_id) ON DELETE CASCADE,
    contact_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50),
    phone VARCHAR(20) NOT NULL
);


-- 24. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(150) NOT NULL,
    table_name VARCHAR(100),
    record_id BIGINT,
    ip_address INET,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 25. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    setting_key VARCHAR(150) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 26. BLOOD REQUEST STATUS HISTORY
CREATE TABLE IF NOT EXISTS blood_request_status_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by BIGINT REFERENCES users(user_id),
    change_note TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 27. APPOINTMENT STATUS HISTORY
CREATE TABLE IF NOT EXISTS appointment_status_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by BIGINT REFERENCES users(user_id),
    change_note TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_donors_blood_group
ON donor_profiles(blood_group);

CREATE INDEX IF NOT EXISTS idx_donors_availability
ON donor_profiles(availability_status);

CREATE INDEX IF NOT EXISTS idx_appointments_donor
ON appointments(donor_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date
ON appointments(appointment_date);

CREATE INDEX IF NOT EXISTS idx_inventory_hospital
ON blood_inventory(hospital_id);

CREATE INDEX IF NOT EXISTS idx_inventory_blood_group
ON blood_inventory(blood_group_id);

CREATE INDEX IF NOT EXISTS idx_requests_status
ON blood_requests(request_status);

CREATE INDEX IF NOT EXISTS idx_requests_urgency
ON blood_requests(urgency);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_donations_donor
ON donations(donor_id);

CREATE INDEX IF NOT EXISTS idx_audit_created
ON audit_logs(created_at);

-- ============================================
-- END OF BLOODBRIDGE SCHEMA
-- ============================================
