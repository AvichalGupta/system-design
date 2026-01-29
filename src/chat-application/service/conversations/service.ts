import { ConversationRepository, ConversationMetaDataRepository, LoggerRepository, UserRepository, ConversationMetaDataController } from "../..";
import { ConversationPrivilegeLevelEnum, ConversationStatusEnum, ConversationTypeEnum, ConversationSchema } from "../../db/schema";
import { IAddContactResponse } from "../users/interface";
import { ICreateGroupResponse, IAddParticipants, ICreateGroup } from "./interface";

export class ConversationServiceBusinessLayer {

    #CLASS_NAME = ConversationServiceBusinessLayer.name;

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

            const conversationDetails = ConversationMetaDataController.getConversationWithMetaData({ conversationId, participantId: userId });

            if (!conversationDetails) {
                throw new Error('Conversation not found.');
            }

            const privilegedUserConversationDetails = ConversationMetaDataController.getConversationWithMetaData({ conversationId, participantId: privilegedUserId });

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
}