export enum ConversationPrivilegeLevelEnum {
    c = 'CREATOR',
    a = 'ADMIN',
    p = 'PARTICIPATOR'
}

export enum ConversationStatusEnum {
    ar = 'ARCHIVED',
    b = 'BLOCKED',
    ac = 'ACTIVE',
    c = 'CLOSED',
    req = 'REQUESTED'
}

export enum ConversationTypeEnum {
    g = 'group',
    s = 'single'
}

export enum MessageStatusEnum {
    q = 'QUEUED',
    d = 'DELIVERED',
    r = 'READ'
}

export enum MessageContentTypeEnum {
    a = 'AUDIO',
    v = 'VIDEO',
    t = 'TEXT',
    f = 'FILE'
}

export interface UserAvatar {
    profilePic: string;
    name: string;
    displayName: string;
    bio: string;
}

export interface UserSchema {
    uniqueId: string;
    avatar: UserAvatar;
    phone: string;
    phoneExtension: string;
    deviceId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface ConversationSchema {
    uniqueId: string;
    participantId: string;
    privilegeLevel: ConversationPrivilegeLevelEnum;
    status: ConversationStatusEnum;
    createdAt: string;
    updatedAt: string;
    lastReadAt: string;
    deletedAt: string | null;
    lastReadMessageId: string | null;
}

export interface ConversationMetaDataSchema {
    conversationId: string;
    conversationName: string | null;
    description: string | null;
    icon: string | null;
    type: ConversationTypeEnum;
}

export interface MessageSchema {
    uniqueId: string;
    creatorId: string;
    conversationId: string;
    content: string;
    contentType: MessageContentTypeEnum;
    status: MessageStatusEnum;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}