import { v7 as uuidV7 } from 'uuid';
import { UsersDB, UsersPhoneDB } from "../..";
import { UserSchema } from "../../db/schema";

export class Users {
    getUser(uniqueId: string): UserSchema | null {
        return UsersDB.get(uniqueId) ?? null
    }

    getUserByPhone(phoneNumber: string): UserSchema | null {
        const userUniqueId = UsersPhoneDB.get(phoneNumber);

        if (!userUniqueId) {
            return null;
        }

        if (!UsersDB.has(userUniqueId)) {
            return null;
        }

        return UsersDB.get(userUniqueId)!;
    }

    #createUserDBSchema(userPayload: Partial<UserSchema>, existingUserSchema: UserSchema | null = null, upsert = false): UserSchema {

        const utcDate = new Date().toUTCString();
        
        if (!userPayload || !Object.keys(userPayload).length) {
            throw new Error('Invalid payload. Missing required keys.');
        }

        if (upsert === false) {

            if (!userPayload.avatar) {
                throw new Error('Invalid payload. Missing avatar details.');
            }

            if (!userPayload.avatar.profilePic) {
                throw new Error('Invalid payload. Missing avatar picture.');
            }

            if (!userPayload.avatar.name) {
                throw new Error('Invalid payload. Missing avatar user name.');
            }

            if (!userPayload.avatar.displayName) {
                throw new Error('Invalid payload. Missing avatar public name.');
            }

            if (!userPayload.phone) {
                throw new Error('Invalid payload. Missing user phone.');
            }
            
            if (!userPayload.phoneExtension) {
                throw new Error('Invalid payload. Missing user extension.');
            }

            if (!userPayload.deviceId) {
                throw new Error('Invalid payload. Missing user identifier.'); 
            }
            
            const userSchemaObj: UserSchema = {
                uniqueId: uuidV7(),
                avatar: {
                    profilePic: userPayload.avatar.profilePic,
                    name: userPayload.avatar.name,
                    displayName: userPayload.avatar.displayName,
                    bio: userPayload.avatar.bio
                },
                phone: userPayload.phone,
                phoneExtension: userPayload.phoneExtension,
                deviceId: userPayload.deviceId,
                createdAt: utcDate,
                updatedAt: utcDate,
                deletedAt: null
            }

            return userSchemaObj;
        } else {

            if (!existingUserSchema || !Object.keys(existingUserSchema).length) {
                throw new Error('Invalid payload. Missing existing object data.');
            }

            const userSchemaObj: UserSchema = {
                uniqueId: existingUserSchema.uniqueId,
                avatar: {
                    profilePic: userPayload.avatar?.profilePic ?? existingUserSchema.avatar.profilePic,
                    name: userPayload.avatar?.name ?? existingUserSchema.avatar.name,
                    displayName: userPayload.avatar?.displayName ?? existingUserSchema.avatar.displayName,
                    bio: userPayload.avatar?.bio ?? existingUserSchema.avatar.bio
                },
                phone: userPayload.phone ?? existingUserSchema.phone,
                phoneExtension: userPayload.phoneExtension ?? existingUserSchema.phone,
                deviceId: userPayload.deviceId ?? existingUserSchema.phone,
                createdAt: existingUserSchema.createdAt,
                updatedAt: utcDate,
                deletedAt: ('deletedAt' in userPayload) ? utcDate : existingUserSchema.deletedAt
            }

            return userSchemaObj;
        }
    }

    createUser(userPayload: Partial<UserSchema>): UserSchema {
        const userDBPayload = this.#createUserDBSchema(userPayload);

        if (UsersDB.has(userDBPayload.uniqueId)) {
            throw new Error('User already exists');
        }

        UsersDB.set(userDBPayload.uniqueId, userDBPayload);
        UsersPhoneDB.set(userDBPayload.phone, userDBPayload.uniqueId);
        return userDBPayload;
    }

    updateUser(uniqueId: string, updatedPayload: Partial<UserSchema>) {
        if (!UsersDB.has(uniqueId)) {
            throw new Error('User does not exist.');
        }

        const existingUser = UsersDB.get(uniqueId)!;
        const updatedDBSchema = this.#createUserDBSchema(updatedPayload, existingUser, true);

        UsersDB.set(uniqueId, updatedDBSchema);

        if (existingUser.phone !== updatedDBSchema.phone) {
            UsersPhoneDB.delete(existingUser.phone);
        }

        if (!UsersPhoneDB.has(updatedDBSchema.phone)) {
            UsersPhoneDB.set(updatedDBSchema.phone, uniqueId);
        }
    }

    markUserAsDeleted(userId: string) {
        this.updateUser(userId, { deletedAt: new Date().toUTCString() } as Partial<UserSchema>);
    }

    deleteUser(uniqueId: string): void {

        if (UsersDB.has(uniqueId)) {
            const existingUser = UsersDB.get(uniqueId)!;
            UsersPhoneDB.delete(existingUser.phone);
            UsersDB.delete(uniqueId);
        }

    }
}