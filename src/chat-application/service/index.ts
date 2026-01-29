import { UserRepository, ConversationRepository, MessageRepository, LoggerRepository, ConversationMetaDataRepository, UserConversationsDB } from "..";
import { ConversationMetaDataSchema, ConversationPrivilegeLevelEnum, ConversationSchema, ConversationStatusEnum, ConversationTypeEnum, MessageSchema, MessageStatusEnum, UserAvatar, UserSchema } from "../db/schema";

export interface IAddContactResponse {
    error?: boolean;
    inviteUser?: boolean;
    conversationId?: string | null;
}

export interface IAddParticipants {
    participantId: string;
    participantsPrivilegeLevel: ConversationPrivilegeLevelEnum;
}

export type IConversationWithMetaData = Pick<
    ConversationSchema & ConversationMetaDataSchema,
    'uniqueId' |
    'participantId' |
    'privilegeLevel' |
    'status' |
    'createdAt' |
    'deletedAt' |
    'updatedAt' |
    'lastReadAt' |
    'lastReadMessageId' |
    'type' |
    'conversationName' |
    'description' |
    'icon'
>;

export type ICreateGroup = Partial<
    Pick<
        IConversationWithMetaData,
        'conversationName' |
        'description' |
        'icon'
    >
    & {
        participantDetails: IAddParticipants[]
    }
>;

export type ICreateGroupResponse = Partial<
    Pick<
        IConversationWithMetaData,
        'uniqueId' |
        'conversationName' |
        'description'
    >
> & {
    error: boolean;
};

export type IUpdateConvoMetadata = Partial<
    Pick<
        IConversationWithMetaData,
        'conversationName' |
        'description' |
        'icon'
    >
>;

export type ISendMessage = Partial<
    Pick<
        MessageSchema,
        'content' |
        'contentType'
    >
>;

export type ISendMessageResponse = Partial<
    Pick<
        MessageSchema,
        'uniqueId' |
        'content' |
        'contentType' |
        'conversationId' |
        'createdAt' |
        'status'
    >
> & {
    error: boolean;
};

export type IFetchConversationMessagesResponse = {
    error: boolean;
    messages?: Partial<
        Pick<
            MessageSchema,
            'uniqueId' |
            'content' |
            'contentType' |
            'conversationId' |
            'createdAt' |
            'status'
        >
    >[];
};

export class ApplicationServiceLayer {

    #CLASS_NAME = ApplicationServiceLayer.name;

    createAccount(userPayload: Partial<UserSchema>): UserSchema | null {
        try {

            const userObj: Partial<UserSchema> = {
                avatar: {
                    profilePic: userPayload.avatar?.profilePic ?? '',
                    name: userPayload.avatar?.name ?? '',
                    displayName: userPayload.avatar?.displayName ?? (userPayload.avatar?.name ?? ''),
                    bio: userPayload.avatar?.bio ?? ''
                },
                phone: userPayload.phone ?? '',
                phoneExtension: userPayload.phoneExtension ?? '',
                deviceId: userPayload.deviceId ?? ''
            }

            return UserRepository.createUser(userObj);
        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.createAccount.name,
                className: this.#CLASS_NAME,
                message: 'Failed to create account.',
                error: error,
            })
            return null;
        }
    }

    updateAccountAvatar(userId: string, userPayload: Partial<UserAvatar>): UserSchema | null {
        try {

            const userObj: Partial<UserSchema> = {
                avatar: {
                    profilePic: userPayload?.profilePic ?? '',
                    name: userPayload?.name ?? '',
                    displayName: userPayload?.displayName ?? '',
                    bio: userPayload?.bio ?? ''
                }
            }

            UserRepository.updateUser(userId, userObj);

            return UserRepository.getUser(userId);
        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.updateAccountAvatar.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update account avatar details.',
                error: error,
            })
            return null;
        }
    }

    updateAccountPhone(userId: string, userPayload: Partial<UserSchema>): UserSchema | null {
        try {

            const userObj: Partial<UserSchema> = {
                phone: userPayload.phone ?? '',
                phoneExtension: userPayload.phoneExtension ?? '',
            }

            UserRepository.updateUser(userId, userObj);

            return UserRepository.getUser(userId);
        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.updateAccountPhone.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update account phone details.',
                error: error,
            })
            return null;
        }
    }

    // Used to create 1:1 chats
    addContact(userId: string, phoneNumberToAdd: string): IAddContactResponse {

        const response: IAddContactResponse = {
            error: false,
            inviteUser: false,
            conversationId: null
        }

        try {

            const existingInviteeDetails: UserSchema | null = UserRepository.getUserByPhone(phoneNumberToAdd);

            if (!existingInviteeDetails) {
                delete response.error;
                response.inviteUser = true;
                response.conversationId = null;
                return response;
            }

            const existingUserConversations = ConversationRepository.getUserConversations(userId);
            const existingParticipantConversations = ConversationRepository.getUserConversations(existingInviteeDetails.uniqueId);

            if (existingUserConversations.length && existingParticipantConversations.length) {
                for (const inviterConvos of existingUserConversations) {
                    for (const inviteeConvos of existingParticipantConversations) {
                        if (inviterConvos.uniqueId === inviteeConvos.uniqueId) {

                            const conversationMetaData = ConversationMetaDataRepository.getConversationMetaData(inviterConvos.uniqueId);
                            
                            if (
                                conversationMetaData && 
                                (
                                    conversationMetaData.type !== ConversationTypeEnum.s || 
                                    conversationMetaData.type !== ConversationTypeEnum.s
                                )
                            ) {
                                continue;
                            }

                            delete response.error;
                            response.inviteUser = false;
                            response.conversationId = inviterConvos.uniqueId;
                            return response;

                        }
                    }
                }
            }

            const newlyInitiatedConvo = ConversationRepository.createConversation({
                participantId: userId,
                privilegeLevel: ConversationPrivilegeLevelEnum.c,
                status: ConversationStatusEnum.ac
            });

            ConversationRepository.createConversation({
                uniqueId: newlyInitiatedConvo.uniqueId,
                participantId: existingInviteeDetails.uniqueId,
                privilegeLevel: ConversationPrivilegeLevelEnum.p,
                status: ConversationStatusEnum.req
            });

            ConversationMetaDataRepository.createConversationMetaData({
                conversationId: newlyInitiatedConvo.uniqueId,
                conversationName: phoneNumberToAdd,
                type: ConversationTypeEnum.s
            });

            delete response.error;
            response.inviteUser = false;
            response.conversationId = newlyInitiatedConvo.uniqueId;
            return response;

        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.addContact.name,
                className: this.#CLASS_NAME,
                message: 'Failed to add contact.',
                error: error,
            })

            response.error = true;
            delete response.inviteUser;
            delete response.conversationId;
        }
        return response;
    }

    #validatePrivilegeLevel(privilegeLevel: string): ConversationPrivilegeLevelEnum | null {
        if (!privilegeLevel) return null;

        if (!Object.values(ConversationPrivilegeLevelEnum).includes(privilegeLevel as ConversationPrivilegeLevelEnum)) {
            return null;
        }

        return privilegeLevel as ConversationPrivilegeLevelEnum;
    }

    createGroup(userId: string, groupPayload: ICreateGroup): ICreateGroupResponse {
        const response: ICreateGroupResponse = {
            uniqueId: '',
            conversationName: '',
            description: '',
            error: false
        }
        try {
            
            const newlyInitiatedConvo = ConversationRepository.createConversation({
                participantId: userId,
                privilegeLevel: ConversationPrivilegeLevelEnum.c,
                status: ConversationStatusEnum.ac
            });

            if (groupPayload.participantDetails?.length) {
                for (const participantInfo of groupPayload.participantDetails) {

                    const existingParticipantDetails = UserRepository.getUser(participantInfo.participantId);

                    if (!existingParticipantDetails) {
                        LoggerRepository.error({
                            methodName: this.createGroup.name,
                            className: this.#CLASS_NAME,
                            message: 'User with id ' + participantInfo.participantId + ' does not exist',
                            error: {} ,
                        })
                        continue;
                    }
                    
                    const validatedPrivilegeLevel = this.#validatePrivilegeLevel(participantInfo.participantsPrivilegeLevel);
                    ConversationRepository.createConversation({
                        participantId: participantInfo.participantId,
                        privilegeLevel: (
                            validatedPrivilegeLevel && 
                            validatedPrivilegeLevel !== ConversationPrivilegeLevelEnum.c 
                                ? validatedPrivilegeLevel 
                                : ConversationPrivilegeLevelEnum.p
                            ),
                        status: ConversationStatusEnum.req
                    });
                }
            }
            
            const newlyInitiatedConvoMetadata =  ConversationMetaDataRepository.createConversationMetaData({
                conversationId: newlyInitiatedConvo.uniqueId,
                conversationName: groupPayload.conversationName,
                description: groupPayload.description,
                icon: groupPayload.icon,
                type: ConversationTypeEnum.g
            });

            response.uniqueId = newlyInitiatedConvo.uniqueId;
            response.conversationName = newlyInitiatedConvoMetadata.conversationName;
            response.description = newlyInitiatedConvoMetadata.description;
        
        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.createGroup.name,
                className: this.#CLASS_NAME,
                message: 'Failed to create group.',
                error: error,
            })
            delete response.uniqueId;
            delete response.conversationName;
            delete response.description;
            response.error = true;
        }
        return response;
    }

    addContactsToGroup(groupId: string, requestorUserId: string, participantDetails: IAddParticipants[]): IAddContactResponse {
        const response: IAddContactResponse = {
            error: false,
            conversationId: null
        }

        try {
           
            if (!participantDetails.length) {
                throw new Error('Participants details missing.');
            }

            const existingGroupDetails: ConversationSchema | null = ConversationRepository.getConversation(groupId, requestorUserId);

            if (!existingGroupDetails) {
                throw new Error('Conversation not found.');
            }

            for (const participantInfo of participantDetails) {
                
                const existingParticipantDetails = UserRepository.getUser(participantInfo.participantId);
                
                if (!existingParticipantDetails) {
                    throw new Error('User details not found.');
                }
            
            }

            for (const participantInfo of participantDetails) {
                
                const validatedPrivilegeLevel = this.#validatePrivilegeLevel(participantInfo.participantsPrivilegeLevel);
                
                ConversationRepository.createConversation({
                    participantId: participantInfo.participantId,
                    privilegeLevel: (
                        validatedPrivilegeLevel && 
                        validatedPrivilegeLevel !== ConversationPrivilegeLevelEnum.c 
                            ? validatedPrivilegeLevel 
                            : ConversationPrivilegeLevelEnum.p
                        ),
                    status: ConversationStatusEnum.req
                });
            
            }

            response.conversationId = groupId;

        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.addContactsToGroup.name,
                className: this.#CLASS_NAME,
                message: 'Failed to add contact to group.',
                error: error,
            })

            response.error = true;
            delete response.conversationId;
        }
        return response;
    }

    getConversationWithMetaData(conversationId: string, participantId: string): IConversationWithMetaData | null {

        try {

            const existingConversation: ConversationSchema | null = ConversationRepository.getConversation(conversationId, participantId);
    
            if (!existingConversation) {
                throw new Error('User Conversation not found');
            }
    
            const existingConversationMetaData: ConversationMetaDataSchema | null = ConversationMetaDataRepository.getConversationMetaData(conversationId);
    
            if (!existingConversationMetaData) {
                throw new Error('User Conversation Metadata not found');
            }
    
            const convoWithMetaData: IConversationWithMetaData = {
                uniqueId: existingConversation.uniqueId,
                participantId: existingConversation.participantId,
                privilegeLevel: existingConversation.privilegeLevel,
                status: existingConversation.status,
                createdAt: existingConversation.createdAt,
                updatedAt: existingConversation.updatedAt,
                deletedAt: existingConversation.deletedAt,
                lastReadAt: existingConversation.lastReadAt,
                lastReadMessageId: existingConversation.lastReadMessageId,
                type: existingConversationMetaData.type,
                conversationName: existingConversationMetaData.conversationName,
                description: existingConversationMetaData.description,
                icon: existingConversationMetaData.icon,
            };
    
            return convoWithMetaData;
        } catch (error) {
            LoggerRepository.error({
                methodName: this.getConversationWithMetaData.name,
                className: this.#CLASS_NAME,
                message: 'Failed to get conversation metadata.',
                error: error,
            })
            return null;
        } 

    }

    updateConversationWithMetaData(conversationId: string, participantId: string, payload: IUpdateConvoMetadata): IAddContactResponse {

        const response: IAddContactResponse = {
            error: false,
            conversationId: null
        }

        try {
            
            const existingConvoMetaData = this.getConversationWithMetaData(conversationId, participantId);
            
            if (!existingConvoMetaData) {
                throw new Error('Conversation MetaData not found.');
            }

            ConversationMetaDataRepository.updateConversationMetaData(conversationId, {
                conversationName: payload.conversationName,
                description: payload.description,
                icon: payload.icon,
            });

            response.conversationId = conversationId;
            delete response.error;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateConversationWithMetaData.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update conversation metadata.',
                error: error,
            })

            response.error = true;
            delete response.conversationId;
        }
 
        return response;
    }

    removeUsersFromGroup(groupId: string, requestorUserId: string, participantIds: string[]): IAddContactResponse {
        
        const response: IAddContactResponse = {
            error: false,
            conversationId: null
        }

        try {
        
            if (!participantIds.length) {
                throw new Error('Participants details missing.');
            }

            const existingGroupDetails: ConversationSchema | null = ConversationRepository.getConversation(groupId, requestorUserId);

            if (!existingGroupDetails) {
                throw new Error('Conversation not found.');
            }

            if (!(existingGroupDetails.privilegeLevel === ConversationPrivilegeLevelEnum.a || existingGroupDetails.privilegeLevel === ConversationPrivilegeLevelEnum.c)) {
                throw new Error('Cannot perform action, privilege restriction.')
            }

            const existingConversationMetaData = ConversationMetaDataRepository.getConversationMetaData(groupId);

            if (
                existingConversationMetaData &&
                existingConversationMetaData.type !== ConversationTypeEnum.g
            ) {
                throw new Error('Cannot perform action, not a group.');
            }

            for (const participantId of participantIds) {

                const existingParticipantDetails = UserRepository.getUser(participantId);
                
                if (!existingParticipantDetails) {
                    LoggerRepository.error({
                        methodName: this.removeUsersFromGroup.name,
                        className: this.#CLASS_NAME,
                        message: 'Failed to remove contact' + participantId + ' from group.',
                        error: {},
                    })
                    continue;
                }
                                
                ConversationRepository.markConversationAsDeleted(groupId, participantId);
            
            }

            response.conversationId = groupId;

        } catch (error: any) {
            LoggerRepository.error({
                methodName: this.removeUsersFromGroup.name,
                className: this.#CLASS_NAME,
                message: 'Failed to remove contacts from group.',
                error: error,
            })

            response.error = true;
            delete response.conversationId;
        }
        return response;
    }

    sendMessage(conversationId: string, userId: string, messagePayload: ISendMessage): ISendMessageResponse {
        const response: ISendMessageResponse = {
            error: false
        }

        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const createMessage: Partial<MessageSchema> = {
                content: messagePayload.content,
                contentType: messagePayload.contentType,
                creatorId: userId,
                conversationId: conversationId
            }

            const createdMessageObj = MessageRepository.createMessage(createMessage);

            response.content = createdMessageObj.content;
            response.contentType = createdMessageObj.contentType;
            response.conversationId = createdMessageObj.conversationId;
            response.createdAt = createdMessageObj.createdAt;
            response.status = createdMessageObj.status;
            response.uniqueId = createdMessageObj.uniqueId;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.sendMessage.name,
                className: this.#CLASS_NAME,
                message: 'Failed to send message.',
                error: error,
            })

            response.error = true;
        }   
        
        return response;
    }

    updateMessage(messageId: string, conversationId: string, userId: string, messagePayload: ISendMessage): ISendMessageResponse {
        const response: ISendMessageResponse = {
            error: false
        }

        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const existingMessage = MessageRepository.getMessage(messageId, conversationId, userId);

            if (!existingMessage || existingMessage.creatorId !== userId) {
                throw new Error('Cannot perform operation, access denied.');
            }

            const updateMessage: Partial<MessageSchema> = {
                content: messagePayload.content,
                contentType: messagePayload.contentType
            }

            MessageRepository.updateMessage(messageId, conversationId, userId, updateMessage);
            
            const updatedMessageObj = MessageRepository.getMessage(messageId, conversationId, userId)!;

            response.content = updatedMessageObj.content;
            response.contentType = updatedMessageObj.contentType;
            response.conversationId = updatedMessageObj.conversationId;
            response.createdAt = updatedMessageObj.createdAt;
            response.status = updatedMessageObj.status;
            response.uniqueId = updatedMessageObj.uniqueId;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateMessage.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update message.',
                error: error,
            })

            response.error = true;
        }   
        
        return response;
    }

    deleteMessage(messageId: string, conversationId: string, userId: string, deleteForEveryone: ISendMessage): void {
        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const existingMessage = MessageRepository.getMessage(messageId, conversationId, userId);

            if (!existingMessage || existingMessage.creatorId !== userId) {
                throw new Error('Cannot perform operation, access denied.');
            }

            if (deleteForEveryone) {
                MessageRepository.deleteMessage(messageId, conversationId, userId);
            } else {
                MessageRepository.markMessageAsDeleted(messageId, conversationId, userId);
            }

        } catch (error) {
            LoggerRepository.error({
                methodName: this.deleteMessage.name,
                className: this.#CLASS_NAME,
                message: 'Failed to delete message.',
                error: error,
            })
        }
    }

    updateMessageStatus(messageId: string, conversationId: string, userId: string, status: MessageStatusEnum): ISendMessageResponse {
        const response: ISendMessageResponse = {
            error: false
        }

        try {

            const existingConversation = ConversationRepository.getConversation(conversationId, userId);

            if (!existingConversation) {
                throw new Error('Conversation not found');
            }

            const existingMessage = MessageRepository.getMessage(messageId, conversationId, userId);

            if (!existingMessage || existingMessage.creatorId !== userId) {
                throw new Error('Cannot perform operation, access denied.');
            }

            if (!Object.values(MessageStatusEnum).includes(status)) {
                throw new Error('Invalid status.');
            }

            MessageRepository.updateMessage(messageId, conversationId, userId, { status });

            const updatedMessageObj = MessageRepository.getMessage(messageId, conversationId, userId)!;

            response.content = updatedMessageObj.content;
            response.contentType = updatedMessageObj.contentType;
            response.conversationId = updatedMessageObj.conversationId;
            response.createdAt = updatedMessageObj.createdAt;
            response.status = updatedMessageObj.status;
            response.uniqueId = updatedMessageObj.uniqueId;

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateMessageStatus.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update message status.',
                error: error,
            })

            response.error = true;
        }   
        
        return response;
    }

    fetchRecentConversations(userId: string) {
        try {
            
            const userConversations = ConversationRepository.getUserConversations(userId);

            const conversationObjects = [];

            for (const userConvoObj of userConversations) {
                
                const { uniqueId: conversationId } = userConvoObj;
                
                const conversationsMetaData = ConversationMetaDataRepository.getConversationMetaData(conversationId);

                conversationObjects.push({
                    conversationId: conversationId,
                    conversationName: conversationsMetaData?.conversationName,
                    description: conversationsMetaData?.description,
                    icon: conversationsMetaData?.icon,
                    status: userConvoObj.status,
                    lastReadAt: userConvoObj.lastReadAt,
                    lastReadMessageId: userConvoObj.lastReadMessageId
                });

            }

            return conversationObjects;
        } catch (error) {
            LoggerRepository.error({
                methodName: this.fetchRecentConversations.name,
                className: this.#CLASS_NAME,
                message: 'Failed to fetch conversations.',
                error: error,
            })
            return [];
        }
    }

    fetchConversationMessages(conversationId: string, userId: string): IFetchConversationMessagesResponse {

        const response: IFetchConversationMessagesResponse = {
            error: false,
            messages: []
        }
        try {
            
            const userDetails = UserRepository.getUser(userId);

            if (!userDetails) {
                throw new Error('User not found.');
            }

            const conversationDetails = this.getConversationWithMetaData(conversationId, userId);

            if (!conversationDetails) {
                throw new Error('Conversation not found.');
            }

            const fetchTillTimeStamp = new Date(conversationDetails.deletedAt ?? new Date()).getTime();

            const conversationMessages = MessageRepository.getConversationMessages(conversationId, userId);

            const messages: MessageSchema[] = [];

            for (const messageObj of conversationMessages) {
                const createdAtTimeStamp = new Date(messageObj.createdAt).getTime();
                if (createdAtTimeStamp <= fetchTillTimeStamp) {
                    messages.push(messageObj);
                }
            }

            messages.sort((a,b) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            });

            response.messages = messages.map((messageObj) => {
                return {
                    uniqueId: messageObj.uniqueId,
                    content: messageObj.content,
                    contentType: messageObj.contentType,
                    conversationId: messageObj.conversationId,
                    createdAt: messageObj.createdAt,
                    status: messageObj.status,
                }
            })

        } catch (error) {
            LoggerRepository.error({
                methodName: this.fetchConversationMessages.name,
                className: this.#CLASS_NAME,
                message: 'Failed to fetch conversation messages.',
                error: error,
            })
            response.error = true;
            delete response.messages;
        }

        return response;
    }

    updateUserPrivilege(conversationId: string, userId: string, privilegeDetails: { userId: string, privilegeLevel: ConversationPrivilegeLevelEnum}): { userId: string, privilegeLevel: ConversationPrivilegeLevelEnum, conversationId: string } | null {
        
        try {

            const { userId: privilegedUserId, privilegeLevel } = privilegeDetails;

            if (!Object.values(ConversationPrivilegeLevelEnum).includes(privilegeLevel)) {
                throw new Error('Invalid privilege value');
            }
        
            const userDetails = UserRepository.getUser(userId);

            if (!userDetails) {
                throw new Error('User not found.');
            }

            const privilegedUserDetails = UserRepository.getUser(privilegedUserId);

            if (!privilegedUserDetails) {
                throw new Error('Privileged user not found.');
            }

            const conversationDetails = this.getConversationWithMetaData(conversationId, userId);

            if (!conversationDetails) {
                throw new Error('Conversation not found.');
            }

            const privilegedUserConversationDetails = this.getConversationWithMetaData(conversationId, privilegedUserId);

            if (!privilegedUserConversationDetails) {
                throw new Error('Privileged user conversation not found.');
            }

            ConversationRepository.updateConversation(conversationId, privilegedUserId, { privilegeLevel });

            const updateConversationDetails = ConversationRepository.getConversation(conversationId, privilegedUserId)!;


            return {
                userId: updateConversationDetails.participantId,
                privilegeLevel: updateConversationDetails.privilegeLevel,
                conversationId: updateConversationDetails.uniqueId
            };

        } catch (error) {
            LoggerRepository.error({
                methodName: this.updateUserPrivilege.name,
                className: this.#CLASS_NAME,
                message: 'Failed to update user privilges.',
                error: error,
            })
            return null;
        }
    }

    /*
        Pending Implementations:
            - These implementations require a database, hence not implementing. Pseudo code is attached below
                - Conversation API to fetch message preview of latest message and counter of unread messages.
                    Get all messages of conversation after lastReadAt timestamp of particular user, count these and send the content of the latest message.
                - Search Users by Name/Phone.
                    Simple ElasticSearch implementation, use a Generalized Inverted Index on the contact names and numbers of each user. Can be done with a trie.
                - Online/Offline Indicator.
                    Store a last online time stamp, whenever user is online update the timestamp.
                    On FE, use websockets and send a availabilityStatusChange message. This message will respond with latest timestamp and is broadcast to everyone in the conversation.
    */
}