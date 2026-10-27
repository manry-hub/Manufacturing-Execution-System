BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [users_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[user_role_assignments] (
    [user_id] NVARCHAR(1000) NOT NULL,
    [role_id] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [user_role_assignments_pkey] PRIMARY KEY CLUSTERED ([user_id],[role_id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [user_id] NVARCHAR(1000),
    [action] VARCHAR(100) NOT NULL,
    [entity_type] VARCHAR(50) NOT NULL,
    [entity_id] VARCHAR(36) NOT NULL,
    [old_values] NVARCHAR(max),
    [new_values] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[plants] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] VARCHAR(150) NOT NULL,
    [timezone] VARCHAR(50) NOT NULL CONSTRAINT [plants_timezone_df] DEFAULT 'UTC',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [plants_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [plants_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [plants_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [plants_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[production_areas] (
    [id] NVARCHAR(1000) NOT NULL,
    [plant_id] NVARCHAR(1000) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] VARCHAR(150) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [production_areas_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [production_areas_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [production_areas_plant_id_code_key] UNIQUE NONCLUSTERED ([plant_id],[code])
);

-- CreateTable
CREATE TABLE [dbo].[machines] (
    [id] NVARCHAR(1000) NOT NULL,
    [area_id] NVARCHAR(1000) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] VARCHAR(150) NOT NULL,
    [clamping_tonnage] INT,
    [is_virtual] BIT NOT NULL CONSTRAINT [machines_is_virtual_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [machines_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [machines_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [machines_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[products] (
    [id] NVARCHAR(1000) NOT NULL,
    [part_number] VARCHAR(100) NOT NULL,
    [name] VARCHAR(200) NOT NULL,
    [standard_cycle_time] DECIMAL(8,2) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [products_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [products_part_number_key] UNIQUE NONCLUSTERED ([part_number])
);

-- CreateTable
CREATE TABLE [dbo].[molds] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] VARCHAR(150) NOT NULL,
    [cavity_count] INT NOT NULL CONSTRAINT [molds_cavity_count_df] DEFAULT 1,
    [total_shots] BIGINT NOT NULL CONSTRAINT [molds_total_shots_df] DEFAULT 0,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [molds_status_df] DEFAULT 'AVAILABLE',
    CONSTRAINT [molds_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [molds_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[mold_product_compatibilities] (
    [id] NVARCHAR(1000) NOT NULL,
    [mold_id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [ideal_cycle_time] DECIMAL(8,2) NOT NULL,
    CONSTRAINT [mold_product_compatibilities_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [mold_product_compatibilities_mold_id_product_id_key] UNIQUE NONCLUSTERED ([mold_id],[product_id])
);

-- CreateTable
CREATE TABLE [dbo].[production_orders] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_number] VARCHAR(50) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [target_quantity] INT NOT NULL,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [production_orders_status_df] DEFAULT 'DRAFT',
    [planned_start_time] DATETIME2 NOT NULL,
    [actual_start_time] DATETIME2,
    [actual_end_time] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [production_orders_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [production_orders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [production_orders_order_number_key] UNIQUE NONCLUSTERED ([order_number])
);

-- CreateTable
CREATE TABLE [dbo].[production_runs] (
    [id] NVARCHAR(1000) NOT NULL,
    [production_order_id] NVARCHAR(1000) NOT NULL,
    [machine_id] NVARCHAR(1000) NOT NULL,
    [mold_id] NVARCHAR(1000) NOT NULL,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [production_runs_status_df] DEFAULT 'SETUP',
    [total_shots] INT NOT NULL CONSTRAINT [production_runs_total_shots_df] DEFAULT 0,
    [good_quantity] INT NOT NULL CONSTRAINT [production_runs_good_quantity_df] DEFAULT 0,
    [reject_quantity] INT NOT NULL CONSTRAINT [production_runs_reject_quantity_df] DEFAULT 0,
    [start_time] DATETIME2 NOT NULL CONSTRAINT [production_runs_start_time_df] DEFAULT CURRENT_TIMESTAMP,
    [end_time] DATETIME2,
    CONSTRAINT [production_runs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[machine_current_states] (
    [machine_id] NVARCHAR(1000) NOT NULL,
    [normalized_status] VARCHAR(30) NOT NULL,
    [raw_status] VARCHAR(100),
    [active_run_id] NVARCHAR(1000),
    [current_cycle_time] DECIMAL(8,2),
    [last_event_timestamp] DATETIME2 NOT NULL,
    [connection_status] VARCHAR(30) NOT NULL CONSTRAINT [machine_current_states_connection_status_df] DEFAULT 'ONLINE',
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [machine_current_states_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [machine_current_states_pkey] PRIMARY KEY CLUSTERED ([machine_id])
);

-- CreateTable
CREATE TABLE [dbo].[machine_event_logs] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [event_id] VARCHAR(64) NOT NULL,
    [machine_id] NVARCHAR(1000) NOT NULL,
    [event_type] VARCHAR(50) NOT NULL,
    [normalized_status] VARCHAR(30) NOT NULL,
    [source_timestamp] DATETIME2 NOT NULL,
    [received_timestamp] DATETIME2 NOT NULL CONSTRAINT [machine_event_logs_received_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [cycle_counter] BIGINT,
    [fault_code] VARCHAR(50),
    [raw_payload] NVARCHAR(max),
    [is_simulated] BIT NOT NULL CONSTRAINT [machine_event_logs_is_simulated_df] DEFAULT 1,
    CONSTRAINT [machine_event_logs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [machine_event_logs_event_id_key] UNIQUE NONCLUSTERED ([event_id])
);

-- CreateTable
CREATE TABLE [dbo].[downtime_reasons] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [category] VARCHAR(50) NOT NULL,
    [description] VARCHAR(200) NOT NULL,
    [is_planned] BIT NOT NULL CONSTRAINT [downtime_reasons_is_planned_df] DEFAULT 0,
    CONSTRAINT [downtime_reasons_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [downtime_reasons_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[machine_time_segments] (
    [id] BIGINT NOT NULL IDENTITY(1,1),
    [machine_id] NVARCHAR(1000) NOT NULL,
    [category] VARCHAR(30) NOT NULL,
    [start_time] DATETIME2 NOT NULL,
    [end_time] DATETIME2 NOT NULL,
    [duration_seconds] INT NOT NULL,
    [downtime_reason_id] NVARCHAR(1000),
    CONSTRAINT [machine_time_segments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[oee_results] (
    [id] NVARCHAR(1000) NOT NULL,
    [machine_id] NVARCHAR(1000) NOT NULL,
    [run_id] NVARCHAR(1000),
    [calculation_window] VARCHAR(20) NOT NULL,
    [availability] DECIMAL(5,4) NOT NULL,
    [performance] DECIMAL(5,4) NOT NULL,
    [quality] DECIMAL(5,4) NOT NULL,
    [oee] DECIMAL(5,4) NOT NULL,
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [oee_results_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [oee_results_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[andon_tickets] (
    [id] NVARCHAR(1000) NOT NULL,
    [ticket_number] VARCHAR(50) NOT NULL,
    [machine_id] NVARCHAR(1000) NOT NULL,
    [category] VARCHAR(50) NOT NULL,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [andon_tickets_status_df] DEFAULT 'OPEN',
    [reported_by_id] NVARCHAR(1000) NOT NULL,
    [assigned_to_id] NVARCHAR(1000),
    [report_time] DATETIME2 NOT NULL CONSTRAINT [andon_tickets_report_time_df] DEFAULT CURRENT_TIMESTAMP,
    [response_time] DATETIME2,
    [resolution_time] DATETIME2,
    [confirmed_root_cause] NVARCHAR(500),
    [corrective_action] NVARCHAR(500),
    CONSTRAINT [andon_tickets_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [andon_tickets_ticket_number_key] UNIQUE NONCLUSTERED ([ticket_number])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_audit_query] ON [dbo].[audit_logs]([entity_type], [entity_id], [created_at] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_area_plant] ON [dbo].[production_areas]([plant_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_machine_area] ON [dbo].[machines]([area_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_comp_mold] ON [dbo].[mold_product_compatibilities]([mold_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_comp_product] ON [dbo].[mold_product_compatibilities]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_po_product] ON [dbo].[production_orders]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_po_status] ON [dbo].[production_orders]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_pr_order] ON [dbo].[production_runs]([production_order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_pr_machine] ON [dbo].[production_runs]([machine_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_pr_status] ON [dbo].[production_runs]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_mel_machine_time] ON [dbo].[machine_event_logs]([machine_id], [source_timestamp] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_mel_type] ON [dbo].[machine_event_logs]([event_type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_mts_machine_window] ON [dbo].[machine_time_segments]([machine_id], [start_time], [end_time]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_oee_lookup] ON [dbo].[oee_results]([machine_id], [timestamp] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [idx_andon_active] ON [dbo].[andon_tickets]([machine_id], [status]);

-- AddForeignKey
ALTER TABLE [dbo].[user_role_assignments] ADD CONSTRAINT [user_role_assignments_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_role_assignments] ADD CONSTRAINT [user_role_assignments_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[production_areas] ADD CONSTRAINT [production_areas_plant_id_fkey] FOREIGN KEY ([plant_id]) REFERENCES [dbo].[plants]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[machines] ADD CONSTRAINT [machines_area_id_fkey] FOREIGN KEY ([area_id]) REFERENCES [dbo].[production_areas]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[mold_product_compatibilities] ADD CONSTRAINT [mold_product_compatibilities_mold_id_fkey] FOREIGN KEY ([mold_id]) REFERENCES [dbo].[molds]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[mold_product_compatibilities] ADD CONSTRAINT [mold_product_compatibilities_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[production_orders] ADD CONSTRAINT [production_orders_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[production_runs] ADD CONSTRAINT [production_runs_production_order_id_fkey] FOREIGN KEY ([production_order_id]) REFERENCES [dbo].[production_orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[production_runs] ADD CONSTRAINT [production_runs_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[production_runs] ADD CONSTRAINT [production_runs_mold_id_fkey] FOREIGN KEY ([mold_id]) REFERENCES [dbo].[molds]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[machine_current_states] ADD CONSTRAINT [machine_current_states_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[machine_current_states] ADD CONSTRAINT [machine_current_states_active_run_id_fkey] FOREIGN KEY ([active_run_id]) REFERENCES [dbo].[production_runs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[machine_event_logs] ADD CONSTRAINT [machine_event_logs_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[machine_time_segments] ADD CONSTRAINT [machine_time_segments_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[machine_time_segments] ADD CONSTRAINT [machine_time_segments_downtime_reason_id_fkey] FOREIGN KEY ([downtime_reason_id]) REFERENCES [dbo].[downtime_reasons]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[oee_results] ADD CONSTRAINT [oee_results_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[oee_results] ADD CONSTRAINT [oee_results_run_id_fkey] FOREIGN KEY ([run_id]) REFERENCES [dbo].[production_runs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[andon_tickets] ADD CONSTRAINT [andon_tickets_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[andon_tickets] ADD CONSTRAINT [andon_tickets_reported_by_id_fkey] FOREIGN KEY ([reported_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[andon_tickets] ADD CONSTRAINT [andon_tickets_assigned_to_id_fkey] FOREIGN KEY ([assigned_to_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
