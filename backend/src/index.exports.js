/**
 * Índice de exportaciones - Arquitectura Modular
 * 
 * Facilita la importación de todos los componentes
 */

// Core
export { Context } from './core/Context.js';
export { Engine } from './core/Engine.js';
export { EventEmitter, EVENTS } from './core/EventEmitter.js';

// Repositories
export { BaseRepository } from './repositories/BaseRepository.js';
export { ChatRepository } from './repositories/ChatRepository.js';
export { AgentRepository } from './repositories/AgentRepository.js';
export { TableRepository } from './repositories/TableRepository.js';
export { TableDataRepository } from './repositories/TableDataRepository.js';

// Domain - Actions
export { ActionHandler } from './domain/actions/ActionHandler.js';
export { CreateHandler } from './domain/actions/CreateHandler.js';
export { QueryHandler } from './domain/actions/QueryHandler.js';
export { UpdateHandler } from './domain/actions/UpdateHandler.js';
export { AvailabilityHandler } from './domain/actions/AvailabilityHandler.js';
export { FallbackHandler } from './domain/actions/FallbackHandler.js';
export { ActionFactory } from './domain/actions/ActionFactory.js';

// Domain - Fields
export { FieldCollector } from './domain/fields/FieldCollector.js';

// Domain - Responses
export { ResponseBuilder } from './domain/responses/ResponseBuilder.js';
export { TemplateEngine, Helpers } from './domain/responses/TemplateEngine.js';

// Integrations - AI
export { AIProvider } from './integrations/ai/AIProvider.js';
export { OpenAIProvider, getOpenAIProvider } from './integrations/ai/OpenAIProvider.js';

// Services
export { ChatService, createChatService } from './services/ChatService.js';
export { AgentCapabilities } from './services/AgentCapabilities.js';

// Parsing
export { QueryParser } from './parsing/QueryParser.js';
export { DateRangeParser } from './parsing/DateRangeParser.js';
