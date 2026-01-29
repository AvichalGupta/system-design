CREATE TABLE IF NOT EXISTS users (
    uniqueId UUID PRIMARY KEY DEFAULT uuidv7(), -- UUID to uniquely identify a conversation.
    avatar JSONB,
    phone INT UNIQUE,
    phoneExtension VARCHAR(10),
    displayName VARCHAR(255),
    deviceId TEXT,
    createdAt DATETIME default now(),
    updatedAt DATETIME default now()
)

CREATE TABLE IF NOT EXISTS userContacts (
    userId UUID NOT NULL, -- UUID to uniquely identify a user. 1:1 Mapping with users table.
    contactUserId UUID NOT NULL
)

-- Metadata like table, it stores 1:1 mapping with users.
CREATE TABLE IF NOT EXISTS conversations (
    uniqueId UUID PRIMARY KEY DEFAULT uuidv7(), -- UUID to uniquely identify a conversation. For a 1:1 chat, there will be 2 entries for the same uniqueId key. For a group chat, there will be N entries for the same uniqueId key.
    participantId UUID,
    privilegeLevel TEXT,
    status TEXT,
    createdAt DATETIME default now(),
    updatedAt DATETIME default now(),
    lastReadAt DATETIME default now(),
    lastReadMessageId UUID,
)

CREATE TABLE IF NOT EXISTS conversationMetadata (
    conversationId UUID UNIQUE NOT NULL, -- UUID to uniquely identify a conversation. 1:1 Mapping with conversations table.
    conversationName VARCHAR(255), -- Applicable for both 1:1 and group chats. This is the display name of the chat that the user saved in case of 1:1 and the group name decided by the creator when creating group.
    description TEXT, -- Only used in case of groups.
    icon TEXT,
    type TEXT,
)

CREATE TABLE IF NOT EXISTS messages (
    uniqueId UUID PRIMARY KEY DEFAULT uuidv7(), -- UUID to uniquely identify a conversation.
    creatorId UUID,
    conversationId UUID,
    content TEXT,
    contentType TEXT,
    status TEXT,
    createdAt DATETIME default now(),
    updatedAt DATETIME default now(),
)

CREATE TYPE conversationStatus AS ENUM ('ARCHIVED','BLOCKED','ACTIVE','CLOSED');
CREATE TYPE conversationPrivilegeLevel AS ENUM ('CREATOR','ADMIN','PARTICIPATOR');
CREATE TYPE conversationConvoType AS ENUM ('GROUP','SINGLE');
CREATE TYPE messageContentType AS ENUM ('AUDIO','VIDEO','TEXT','FILE');
CREATE TYPE messageStatus AS ENUM ('DELIVERED','READ');

ALTER TABLE conversations ADD CONSTRAINT fk_conversations_participant_id FOREIGN KEY (participantId) REFERENCES users(uniqueId) NOT NULL;
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_last_read_message_id FOREIGN KEY (lastReadMessageId) REFERENCES messages(uniqueId);
ALTER TABLE conversationMetadata ADD CONSTRAINT fk_conversation_metadata_conversation_id FOREIGN KEY (conversationId) REFERENCES conversations(uniqueId);
ALTER TABLE messages ADD CONSTRAINT fk_messages_creator_id FOREIGN KEY (creatorId) REFERENCES users(uniqueId) NOT NULL;
ALTER TABLE messages ADD CONSTRAINT fk_messages_conversation_id FOREIGN KEY (conversationId) REFERENCES conversations(uniqueId) NOT NULL;

ALTER TABLE conversations ALTER COLUMN status TYPE conversationStatus;
ALTER TABLE conversations ALTER COLUMN privilegeLevel TYPE conversationPrivilegeLevel;
ALTER TABLE conversationMetadata ALTER COLUMN type TYPE conversationConvoType;
ALTER TABLE messages ALTER COLUMN status TYPE messageStatus;
ALTER TABLE messages ALTER COLUMN contentType TYPE messageContentType;