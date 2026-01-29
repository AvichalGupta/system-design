import {
    IControllerAddContactPayload,
    IControllerCreateAccountPayload,
    IControllerUpdateAccountAvatarPayload,
    IControllerUpdateAccountPhonePayload
} from "./interface";
import { UserServiceBusinessLayer } from "./service";

export class UserControllerBusinessLayer {
    #serviceLayer: UserServiceBusinessLayer;

    constructor() {
        this.#serviceLayer = new UserServiceBusinessLayer();
    }

    createAccount(payload: IControllerCreateAccountPayload) {
        return this.#serviceLayer.createAccount(payload.userPayload);
    }

    updateAccountAvatar(payload: IControllerUpdateAccountAvatarPayload) {
        return this.#serviceLayer.updateAccountAvatar(payload.userId, payload.userPayload);
    }

    updateAccountPhone(payload: IControllerUpdateAccountPhonePayload) {
        return this.#serviceLayer.updateAccountPhone(payload.userId, payload.userPayload);
    }

    addContact(payload: IControllerAddContactPayload) {
        return this.#serviceLayer.addContact(payload.userId, payload.phoneNumberToAdd);
    }
}
