import { UserSchema, ConversationSchema, MessageSchema, ConversationMetaDataSchema } from "./db/schema";
import { ConversationMetaData } from "./entities/conversation_metadata/service";
import { Conversations } from "./entities/conversations/service";
import { Messages } from "./entities/messages/service";
import { Users } from "./entities/users/service";
import { Logger } from "./logger/service";

export const UsersDB = new Map<string, UserSchema>(); // UserSchema.uniqueId as key, used to store user state
export const UsersPhoneDB = new Map<string, string>(); // UserSchema.phone as key, UserSchema.uniqueId as value. Used to store user phone and user id mapping, useful for phone number based access patterns.
export const ConversationsDB = new Map<string, ConversationSchema>(); // UserSchema.uniqueId_ConversationSchema.uniqueId as key, used to store a 1:1 map of user:convo state.
export const ConversationsMetaDataDB = new Map<string, ConversationMetaDataSchema>(); // ConversationSchema.uniqueId as key, used to store a 1:1 map of convo:metadata state.
export const UserConversationsDB = new Map<string, Set<string>>(); // UserSchema.uniqueId as key, Set<ConversationSchema.uniqueId> as values, used for quick lookups to get all conversations a user is associated with.
export const MessagesDB = new Map<string, MessageSchema>(); // MessageSchema.uniqueId_UserSchema.uniqueId_ConversationSchema.uniqueId as key, used to store a 1:1:1 map of message:user:convo state.
export const ConversationMessagesDB = new Map<string, Set<string>>(); // ConversationSchema.uniqueId as key, Set<MessageSchema.uniqueId> as values, used for quick lookups to get all messages a conversation is associated with.

export const UserRepository = new Users();
export const ConversationRepository = new Conversations();
export const ConversationMetaDataRepository = new ConversationMetaData();
export const MessageRepository = new Messages();
export const LoggerRepository = new Logger();