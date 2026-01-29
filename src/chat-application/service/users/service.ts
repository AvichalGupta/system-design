import { UserRepository, LoggerRepository, ConversationRepository, ConversationMetaDataRepository } from "../..";
import { UserSchema, UserAvatar, ConversationTypeEnum, ConversationPrivilegeLevelEnum, ConversationStatusEnum } from "../../db/schema";
import { IAddContactResponse } from "./interface";

export class UserServiceBusinessLayer {

    #CLASS_NAME = UserServiceBusinessLayer.name;

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
}