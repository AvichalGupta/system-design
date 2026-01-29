import { ConversationPrivilegeLevelEnum } from "../../db/schema";
import { IConversationWithMetaData } from "../conversation_metadata/interface";

export interface IAddParticipants {
    participantId: string;
    participantsPrivilegeLevel: ConversationPrivilegeLevelEnum;
}

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

export interface IUpdateUserPrivilegeDetails {
    userId: string;
    privilegeLevel: ConversationPrivilegeLevelEnum;
}

export interface IControllerCreateGroupPayload {
    userId: string;
    groupPayload: ICreateGroup;
}

export interface IControllerAddContactsToGroupPayload {
    groupId: string;
    requestorUserId: string;
    participantDetails: IAddParticipants[];
}

export interface IControllerRemoveUsersFromGroupPayload {
    groupId: string;
    requestorUserId: string;
    participantIds: string[];
}

export interface IControllerUpdateUserPrivilegePayload {
    conversationId: string;
    userId: string;
    privilegeDetails: IUpdateUserPrivilegeDetails;
}

export interface IControllerFetchRecentConversationsPayload {
    userId: string;
}
