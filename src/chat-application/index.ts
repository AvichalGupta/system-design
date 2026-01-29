import { UserSchema, ConversationSchema, MessageSchema, ConversationMetaDataSchema } from "./db/schema";
import { ConversationMetaData } from "./entities/conversation_metadata/service";
import { Conversations } from "./entities/conversations/service";
import { Messages } from "./entities/messages/service";
import { Users } from "./entities/users/service";
import { Logger } from "./logger/service";
import { ConversationMetaDataControllerBusinessLayer } from "./service/conversation_metadata/controller";
import { ConversationControllerBusinessLayer } from "./service/conversations/controller";
import { MessageControllerBusinessLayer } from "./service/messages/controller";
import { UserControllerBusinessLayer } from "./service/users/controller";

// SingleTon In Memory Databases
export const UsersDB = new Map<string, UserSchema>(); // UserSchema.uniqueId as key, used to store user state
export const UsersPhoneDB = new Map<string, string>(); // UserSchema.phone as key, UserSchema.uniqueId as value. Used to store user phone and user id mapping, useful for phone number based access patterns.
export const ConversationsDB = new Map<string, ConversationSchema>(); // UserSchema.uniqueId_ConversationSchema.uniqueId as key, used to store a 1:1 map of user:convo state.
export const ConversationsMetaDataDB = new Map<string, ConversationMetaDataSchema>(); // ConversationSchema.uniqueId as key, used to store a 1:1 map of convo:metadata state.
export const UserConversationsDB = new Map<string, Set<string>>(); // UserSchema.uniqueId as key, Set<ConversationSchema.uniqueId> as values, used for quick lookups to get all conversations a user is associated with.
export const MessagesDB = new Map<string, MessageSchema>(); // MessageSchema.uniqueId_UserSchema.uniqueId_ConversationSchema.uniqueId as key, used to store a 1:1:1 map of message:user:convo state.
export const ConversationMessagesDB = new Map<string, Set<string>>(); // ConversationSchema.uniqueId as key, Set<MessageSchema.uniqueId> as values, used for quick lookups to get all messages a conversation is associated with.

// SingleTon CRUD Classes
export const UserRepository = new Users();
export const ConversationRepository = new Conversations();
export const ConversationMetaDataRepository = new ConversationMetaData();
export const MessageRepository = new Messages();
export const LoggerRepository = new Logger();

// SingleTon Controller Classes, created to avoid exposing service layer of business logic.
export const UserController = new UserControllerBusinessLayer();
export const ConversationController = new ConversationControllerBusinessLayer();
export const ConversationMetaDataController = new ConversationMetaDataControllerBusinessLayer();
export const MessageController = new MessageControllerBusinessLayer();

// The Controller Classes can be used to interact with both websockets or https APIs

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