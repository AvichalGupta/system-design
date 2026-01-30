import { UserAvatar, UserSchema } from "../../db/schema";

export interface IAddContactResponse {
    error?: boolean;
    inviteUser?: boolean;
    conversationId?: string | null;
}

export interface IControllerCreateAccountPayload {
    userPayload: Partial<UserSchema>;
}

export interface IControllerUpdateAccountAvatarPayload {
    userId: string;
    userPayload: Partial<UserAvatar>;
}

export interface IControllerUpdateAccountPhonePayload {
    userId: string;
    userPayload: Partial<UserSchema>;
}

export interface IControllerAddContactPayload {
    userId: string;
    phoneNumberToAdd: string;
}
