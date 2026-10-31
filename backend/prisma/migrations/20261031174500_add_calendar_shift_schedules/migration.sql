BEGIN TRY
    BEGIN TRANSACTION;

    -- CreateTable factory_calendar_days
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'factory_calendar_days')
    BEGIN
        CREATE TABLE [dbo].[factory_calendar_days] (
            [id] NVARCHAR(1000) NOT NULL,
            [plant_id] NVARCHAR(1000) NOT NULL,
            [calendar_date] DATE NOT NULL,
            [day_type] VARCHAR(30) NOT NULL,
            [description] VARCHAR(150),
            [is_operating] BIT NOT NULL CONSTRAINT [factory_calendar_days_is_operating_df] DEFAULT 1,
            [created_at] DATETIME2 NOT NULL CONSTRAINT [factory_calendar_days_created_at_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [factory_calendar_days_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [factory_calendar_days_plant_id_calendar_date_key] UNIQUE NONCLUSTERED ([plant_id], [calendar_date])
        );

        CREATE NONCLUSTERED INDEX [idx_fcd_plant_date] ON [dbo].[factory_calendar_days]([plant_id], [calendar_date]);
        ALTER TABLE [dbo].[factory_calendar_days] ADD CONSTRAINT [factory_calendar_days_plant_id_fkey] FOREIGN KEY ([plant_id]) REFERENCES [dbo].[plants]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
    END;

    -- CreateTable shift_definitions
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'shift_definitions')
    BEGIN
        CREATE TABLE [dbo].[shift_definitions] (
            [id] NVARCHAR(1000) NOT NULL,
            [plant_id] NVARCHAR(1000) NOT NULL,
            [shift_number] INT NOT NULL,
            [code] VARCHAR(30) NOT NULL,
            [name] VARCHAR(100) NOT NULL,
            [start_time] VARCHAR(8) NOT NULL,
            [end_time] VARCHAR(8) NOT NULL,
            [duration_minutes] INT NOT NULL CONSTRAINT [shift_definitions_duration_minutes_df] DEFAULT 480,
            [planned_break_minutes] INT NOT NULL CONSTRAINT [shift_definitions_planned_break_minutes_df] DEFAULT 60,
            [crosses_midnight] BIT NOT NULL CONSTRAINT [shift_definitions_crosses_midnight_df] DEFAULT 0,
            [is_active] BIT NOT NULL CONSTRAINT [shift_definitions_is_active_df] DEFAULT 1,
            [created_at] DATETIME2 NOT NULL CONSTRAINT [shift_definitions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [shift_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [shift_definitions_plant_id_shift_number_key] UNIQUE NONCLUSTERED ([plant_id], [shift_number])
        );

        ALTER TABLE [dbo].[shift_definitions] ADD CONSTRAINT [shift_definitions_plant_id_fkey] FOREIGN KEY ([plant_id]) REFERENCES [dbo].[plants]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
    END;

    -- CreateTable machine_operating_schedules
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'machine_operating_schedules')
    BEGIN
        CREATE TABLE [dbo].[machine_operating_schedules] (
            [id] NVARCHAR(1000) NOT NULL,
            [machine_id] NVARCHAR(1000) NOT NULL,
            [shift_id] NVARCHAR(1000) NOT NULL,
            [schedule_date] DATE NOT NULL,
            [operating_mode] VARCHAR(30) NOT NULL CONSTRAINT [machine_operating_schedules_operating_mode_df] DEFAULT 'PRODUCTION',
            [planned_duration_minutes] INT NOT NULL CONSTRAINT [machine_operating_schedules_planned_duration_minutes_df] DEFAULT 420,
            [planned_start_time] DATETIME2 NOT NULL,
            [planned_end_time] DATETIME2 NOT NULL,
            [notes] VARCHAR(255),
            [created_at] DATETIME2 NOT NULL CONSTRAINT [machine_operating_schedules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [machine_operating_schedules_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [machine_operating_schedules_machine_id_schedule_date_shift_id_key] UNIQUE NONCLUSTERED ([machine_id], [schedule_date], [shift_id])
        );

        CREATE NONCLUSTERED INDEX [idx_mos_machine_window] ON [dbo].[machine_operating_schedules]([machine_id], [planned_start_time], [planned_end_time]);
        CREATE NONCLUSTERED INDEX [idx_mos_date] ON [dbo].[machine_operating_schedules]([schedule_date]);
        ALTER TABLE [dbo].[machine_operating_schedules] ADD CONSTRAINT [machine_operating_schedules_machine_id_fkey] FOREIGN KEY ([machine_id]) REFERENCES [dbo].[machines]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
        ALTER TABLE [dbo].[machine_operating_schedules] ADD CONSTRAINT [machine_operating_schedules_shift_id_fkey] FOREIGN KEY ([shift_id]) REFERENCES [dbo].[shift_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
