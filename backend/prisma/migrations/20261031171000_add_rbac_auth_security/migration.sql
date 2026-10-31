-- AlterTable user_role_assignments: Add scope_type, scope_id, created_at, and update Primary Key
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[user_role_assignments]') AND name = 'scope_type')
BEGIN
    ALTER TABLE [dbo].[user_role_assignments] ADD [scope_type] VARCHAR(20) NOT NULL CONSTRAINT [user_role_assignments_scope_type_df] DEFAULT 'GLOBAL';
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[user_role_assignments]') AND name = 'scope_id')
BEGIN
    ALTER TABLE [dbo].[user_role_assignments] ADD [scope_id] VARCHAR(50) NOT NULL CONSTRAINT [user_role_assignments_scope_id_df] DEFAULT 'GLOBAL';
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[user_role_assignments]') AND name = 'created_at')
BEGIN
    ALTER TABLE [dbo].[user_role_assignments] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [user_role_assignments_created_at_df] DEFAULT CURRENT_TIMESTAMP;
END;

-- Recreate primary key on user_role_assignments with composite key (user_id, role_id, scope_type, scope_id)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'user_role_assignments' AND CONSTRAINT_TYPE = 'PRIMARY KEY')
BEGIN
    DECLARE @pkName NVARCHAR(256);
    SELECT @pkName = CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME = 'user_role_assignments' AND CONSTRAINT_TYPE = 'PRIMARY KEY';
    EXEC('ALTER TABLE [dbo].[user_role_assignments] DROP CONSTRAINT ' + @pkName);
END;

ALTER TABLE [dbo].[user_role_assignments] ADD CONSTRAINT [user_role_assignments_pkey] PRIMARY KEY CLUSTERED ([user_id], [role_id], [scope_type], [scope_id]);

-- CreateTable permissions
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[permissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[permissions] (
        [id] NVARCHAR(1000) NOT NULL,
        [key] VARCHAR(100) NOT NULL,
        [module] VARCHAR(50) NOT NULL,
        [action] VARCHAR(150) NOT NULL,
        [resource] VARCHAR(100) NOT NULL,
        [valid_scope] VARCHAR(50) NOT NULL,
        [risk] VARCHAR(20) NOT NULL CONSTRAINT [permissions_risk_df] DEFAULT 'Low',
        [is_audited] BIT NOT NULL CONSTRAINT [permissions_is_audited_df] DEFAULT 0,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [permissions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [permissions_key_key] UNIQUE NONCLUSTERED ([key])
    );
END;

-- CreateTable role_permissions
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[role_permissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[role_permissions] (
        [id] NVARCHAR(1000) NOT NULL,
        [role_id] NVARCHAR(1000) NOT NULL,
        [permission_id] NVARCHAR(1000) NOT NULL,
        CONSTRAINT [role_permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [uq_role_permission] UNIQUE NONCLUSTERED ([role_id], [permission_id]),
        CONSTRAINT [role_permissions_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT [role_permissions_permission_id_fkey] FOREIGN KEY ([permission_id]) REFERENCES [dbo].[permissions]([id]) ON DELETE CASCADE ON UPDATE NO ACTION
    );
END;

-- CreateTable refresh_tokens
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[refresh_tokens]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[refresh_tokens] (
        [id] NVARCHAR(1000) NOT NULL,
        [user_id] NVARCHAR(1000) NOT NULL,
        [token_hash] VARCHAR(255) NOT NULL,
        [family] VARCHAR(64) NOT NULL,
        [is_revoked] BIT NOT NULL CONSTRAINT [refresh_tokens_is_revoked_df] DEFAULT 0,
        [expires_at] DATETIME2 NOT NULL,
        [replaced_by] VARCHAR(255),
        [created_at] DATETIME2 NOT NULL CONSTRAINT [refresh_tokens_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [refresh_tokens_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [refresh_tokens_token_hash_key] UNIQUE NONCLUSTERED ([token_hash]),
        CONSTRAINT [refresh_tokens_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION
    );
    CREATE NONCLUSTERED INDEX [idx_refresh_user_family] ON [dbo].[refresh_tokens]([user_id], [family]);
END;

-- CreateTable service_accounts
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[service_accounts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[service_accounts] (
        [id] NVARCHAR(1000) NOT NULL,
        [name] VARCHAR(50) NOT NULL,
        [client_id] VARCHAR(50) NOT NULL,
        [secret_hash] VARCHAR(255) NOT NULL,
        [scope_type] VARCHAR(20) NOT NULL CONSTRAINT [service_accounts_scope_type_df] DEFAULT 'PLANT',
        [scope_id] VARCHAR(50) NOT NULL CONSTRAINT [service_accounts_scope_id_df] DEFAULT 'GLOBAL',
        [permissions] NVARCHAR(max) NOT NULL,
        [is_active] BIT NOT NULL CONSTRAINT [service_accounts_is_active_df] DEFAULT 1,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [service_accounts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
        [updated_at] DATETIME2 NOT NULL CONSTRAINT [service_accounts_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [service_accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [service_accounts_name_key] UNIQUE NONCLUSTERED ([name]),
        CONSTRAINT [service_accounts_client_id_key] UNIQUE NONCLUSTERED ([client_id])
    );
END;
