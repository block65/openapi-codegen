import type { RequestMethodCaller } from '@block65/rest-client';
import type { Simplify } from 'type-fest';
import type {
  ListEnginesResponse,
  Engine,
  CreateCompletionRequest,
  CreateCompletionResponse,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
  CreateEditRequest,
  CreateEditResponse,
  CreateImageRequest,
  ImagesResponse,
  CreateEmbeddingRequest,
  CreateEmbeddingResponse,
  CreateTranscriptionResponse,
  CreateTranslationResponse,
  CreateSearchRequest,
  CreateSearchResponse,
  ListFilesResponse,
  OpenAiFile,
  DeleteFileResponse,
  CreateAnswerRequest,
  CreateAnswerResponse,
  CreateClassificationRequest,
  CreateClassificationResponse,
  CreateFineTuneRequest,
  FineTune,
  ListFineTunesResponse,
  ListFineTuneEventsCommandQuery,
  ListFineTuneEventsResponse,
  ListModelsResponse,
  Model,
  DeleteModelResponse,
  CreateModerationRequest,
  CreateModerationResponse,
} from './models.js';

/**
 * listEngines
 *
 *
 * @summary Lists the currently available (non-finetuned) models, and provides basic
 * information about each one such as the owner and availability.
 * @deprecated
 * @deprecated
 * @returns {RequestMethodCaller<ListEnginesResponse>} HTTP 200
 */
export function listEnginesCommand(): RequestMethodCaller<ListEnginesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/engines`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * retrieveEngine
 *
 *
 * @summary Retrieves a model instance, providing basic information about it such as
 * the owner and availability.
 * @deprecated
 * @deprecated
 * @param engineId {String} The ID of the engine to use for this request
 * @returns {RequestMethodCaller<Engine>} HTTP 200
 */
export function retrieveEngineCommand(
  engineId: string,
): RequestMethodCaller<Engine> {
  const req = {
    method: 'get' as const,
    pathname: `/engines/${engineId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createCompletion
 *
 *
 * @summary Creates a completion for the provided prompt and parameters
 * @param parameters.body {CreateCompletionRequest}
 * @returns {RequestMethodCaller<CreateCompletionResponse>} HTTP 200
 */
export function createCompletionCommand(parameters: {
  body: Simplify<CreateCompletionRequest>;
}): RequestMethodCaller<CreateCompletionResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/completions`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createChatCompletion
 *
 *
 * @summary Creates a completion for the chat message
 * @param parameters.body {CreateChatCompletionRequest}
 * @returns {RequestMethodCaller<CreateChatCompletionResponse>} HTTP 200
 */
export function createChatCompletionCommand(parameters: {
  body: Simplify<CreateChatCompletionRequest>;
}): RequestMethodCaller<CreateChatCompletionResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/chat/completions`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createEdit
 *
 *
 * @summary Creates a new edit for the provided input, instruction, and parameters.
 * @param parameters.body {CreateEditRequest}
 * @returns {RequestMethodCaller<CreateEditResponse>} HTTP 200
 */
export function createEditCommand(parameters: {
  body: Simplify<CreateEditRequest>;
}): RequestMethodCaller<CreateEditResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/edits`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createImage
 *
 *
 * @summary Creates an image given a prompt.
 * @param parameters.body {CreateImageRequest}
 * @returns {RequestMethodCaller<ImagesResponse>} HTTP 200
 */
export function createImageCommand(parameters: {
  body: Simplify<CreateImageRequest>;
}): RequestMethodCaller<ImagesResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/images/generations`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createImageEdit
 *
 *
 * @summary Creates an edited or extended image given an original image and a prompt.
 * @returns {RequestMethodCaller<ImagesResponse>} HTTP 200
 */
export function createImageEditCommand(): RequestMethodCaller<ImagesResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/images/edits`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createImageVariation
 *
 *
 * @summary Creates a variation of a given image.
 * @returns {RequestMethodCaller<ImagesResponse>} HTTP 200
 */
export function createImageVariationCommand(): RequestMethodCaller<ImagesResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/images/variations`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createEmbedding
 *
 *
 * @summary Creates an embedding vector representing the input text.
 * @param parameters.body {CreateEmbeddingRequest}
 * @returns {RequestMethodCaller<CreateEmbeddingResponse>} HTTP 200
 */
export function createEmbeddingCommand(parameters: {
  body: Simplify<CreateEmbeddingRequest>;
}): RequestMethodCaller<CreateEmbeddingResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/embeddings`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createTranscription
 *
 *
 * @summary Transcribes audio into the input language.
 * @returns {RequestMethodCaller<CreateTranscriptionResponse>} HTTP 200
 */
export function createTranscriptionCommand(): RequestMethodCaller<CreateTranscriptionResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/audio/transcriptions`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createTranslation
 *
 *
 * @summary Translates audio into into English.
 * @returns {RequestMethodCaller<CreateTranslationResponse>} HTTP 200
 */
export function createTranslationCommand(): RequestMethodCaller<CreateTranslationResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/audio/translations`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createSearch
 *
 *
 * @summary The search endpoint computes similarity scores between provided query and
 * documents. Documents can be passed directly to the API if there are no more
 * than 200 of them.
 *
 * To go beyond the 200 document limit, documents can be processed offline and
 * then used for efficient retrieval at query time. When `file` is set, the
 * search endpoint searches over all the documents in the given file and
 * returns up to the `max_rerank` number of documents. These documents will be
 * returned along with their search scores.
 *
 * The similarity score is a positive score that usually ranges from 0 to 300
 * (but can sometimes go higher), where a score above 200 usually means the
 * document is semantically similar to the query.
 * @deprecated
 * @deprecated
 * @param engineId {String} The ID of the engine to use for this request.  You can
 * select one of `ada`, `babbage`, `curie`, or `davinci`.
 * @param parameters.body {CreateSearchRequest}
 * @returns {RequestMethodCaller<CreateSearchResponse>} HTTP 200
 */
export function createSearchCommand(
  engineId: string,
  parameters: {
    body: Simplify<CreateSearchRequest>;
  },
): RequestMethodCaller<CreateSearchResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/engines/${engineId}/search`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listFiles
 *
 *
 * @summary Returns a list of files that belong to the user's organization.
 * @returns {RequestMethodCaller<ListFilesResponse>} HTTP 200
 */
export function listFilesCommand(): RequestMethodCaller<ListFilesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/files`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createFile
 *
 *
 * @summary Upload a file that contains document(s) to be used across various
 * endpoints/features. Currently, the size of all the files uploaded by one
 * organization can be up to 1 GB. Please contact us if you need to increase
 * the storage limit.
 * @returns {RequestMethodCaller<OpenAiFile>} HTTP 200
 */
export function createFileCommand(): RequestMethodCaller<OpenAiFile> {
  const req = {
    method: 'post' as const,
    pathname: `/files`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deleteFile
 *
 *
 * @summary Delete a file.
 * @param fileId {String} The ID of the file to use for this request
 * @returns {RequestMethodCaller<DeleteFileResponse>} HTTP 200
 */
export function deleteFileCommand(
  fileId: string,
): RequestMethodCaller<DeleteFileResponse> {
  const req = {
    method: 'delete' as const,
    pathname: `/files/${fileId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * retrieveFile
 *
 *
 * @summary Returns information about a specific file.
 * @param fileId {String} The ID of the file to use for this request
 * @returns {RequestMethodCaller<OpenAiFile>} HTTP 200
 */
export function retrieveFileCommand(
  fileId: string,
): RequestMethodCaller<OpenAiFile> {
  const req = {
    method: 'get' as const,
    pathname: `/files/${fileId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * downloadFile
 *
 *
 * @summary Returns the contents of the specified file
 * @param fileId {String} The ID of the file to use for this request
 * @returns {RequestMethodCaller<void>} HTTP 200
 */
export function downloadFileCommand(fileId: string): RequestMethodCaller<void> {
  const req = {
    method: 'get' as const,
    pathname: `/files/${fileId}/content`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createAnswer
 *
 *
 * @summary Answers the specified question using the provided documents and examples.
 *
 * The endpoint first [searches](/docs/api-reference/searches) over provided
 * documents or files to find relevant context. The relevant context is
 * combined with the provided examples and question to create the prompt for
 * [completion](/docs/api-reference/completions).
 * @deprecated
 * @deprecated
 * @param parameters.body {CreateAnswerRequest}
 * @returns {RequestMethodCaller<CreateAnswerResponse>} HTTP 200
 */
export function createAnswerCommand(parameters: {
  body: Simplify<CreateAnswerRequest>;
}): RequestMethodCaller<CreateAnswerResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/answers`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createClassification
 *
 *
 * @summary Classifies the specified `query` using provided examples.
 *
 * The endpoint first [searches](/docs/api-reference/searches) over the
 * labeled examples
 * to select the ones most relevant for the particular query. Then, the
 * relevant examples
 * are combined with the query to construct a prompt to produce the final
 * label via the
 * [completions](/docs/api-reference/completions) endpoint.
 *
 * Labeled examples can be provided via an uploaded `file`, or explicitly
 * listed in the
 * request using the `examples` parameter for quick tests and small scale use
 * cases.
 * @deprecated
 * @deprecated
 * @param parameters.body {CreateClassificationRequest}
 * @returns {RequestMethodCaller<CreateClassificationResponse>} HTTP 200
 */
export function createClassificationCommand(parameters: {
  body: Simplify<CreateClassificationRequest>;
}): RequestMethodCaller<CreateClassificationResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/classifications`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createFineTune
 *
 *
 * @summary Creates a job that fine-tunes a specified model from a given dataset.
 *
 * Response includes details of the enqueued job including job status and the
 * name of the fine-tuned models once complete.
 *
 * [Learn more about Fine-tuning](/docs/guides/fine-tuning)
 * @param parameters.body {CreateFineTuneRequest}
 * @returns {RequestMethodCaller<FineTune>} HTTP 200
 */
export function createFineTuneCommand(parameters: {
  body: Simplify<CreateFineTuneRequest>;
}): RequestMethodCaller<FineTune> {
  const req = {
    method: 'post' as const,
    pathname: `/fine-tunes`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listFineTunes
 *
 *
 * @summary List your organization's fine-tuning jobs
 * @returns {RequestMethodCaller<ListFineTunesResponse>} HTTP 200
 */
export function listFineTunesCommand(): RequestMethodCaller<ListFineTunesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/fine-tunes`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * retrieveFineTune
 *
 *
 * @summary Gets info about the fine-tune job.
 *
 * [Learn more about Fine-tuning](/docs/guides/fine-tuning)
 * @param fineTuneId {String} The ID of the fine-tune job
 * @returns {RequestMethodCaller<FineTune>} HTTP 200
 */
export function retrieveFineTuneCommand(
  fineTuneId: string,
): RequestMethodCaller<FineTune> {
  const req = {
    method: 'get' as const,
    pathname: `/fine-tunes/${fineTuneId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * cancelFineTune
 *
 *
 * @summary Immediately cancel a fine-tune job.
 * @param fineTuneId {String} The ID of the fine-tune job to cancel
 * @returns {RequestMethodCaller<FineTune>} HTTP 200
 */
export function cancelFineTuneCommand(
  fineTuneId: string,
): RequestMethodCaller<FineTune> {
  const req = {
    method: 'post' as const,
    pathname: `/fine-tunes/${fineTuneId}/cancel`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listFineTuneEvents
 *
 *
 * @summary Get fine-grained status updates for a fine-tune job.
 * @param fineTuneId {String} The ID of the fine-tune job to get events for.
 * @param parameters.query.stream? {String} Whether to stream events for the
 * fine-tune job. If set to true,
 * events will be sent as data-only
 * [server-sent
 * events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format)
 * as they become available. The stream will terminate with a
 * `data: [DONE]` message when the job is finished (succeeded, cancelled,
 * or failed).
 *
 * If set to false, only events generated so far will be returned.
 * @returns {RequestMethodCaller<ListFineTuneEventsResponse>} HTTP 200
 */
export function listFineTuneEventsCommand(
  fineTuneId: string,
  parameters?: {
    query?: ListFineTuneEventsCommandQuery;
  },
): RequestMethodCaller<ListFineTuneEventsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/fine-tunes/${fineTuneId}/events`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listModels
 *
 *
 * @summary Lists the currently available models, and provides basic information about
 * each one such as the owner and availability.
 * @returns {RequestMethodCaller<ListModelsResponse>} HTTP 200
 */
export function listModelsCommand(): RequestMethodCaller<ListModelsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/models`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * retrieveModel
 *
 *
 * @summary Retrieves a model instance, providing basic information about the model
 * such as the owner and permissioning.
 * @param model {String} The ID of the model to use for this request
 * @returns {RequestMethodCaller<Model>} HTTP 200
 */
export function retrieveModelCommand(
  model: string,
): RequestMethodCaller<Model> {
  const req = {
    method: 'get' as const,
    pathname: `/models/${model}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deleteModel
 *
 *
 * @summary Delete a fine-tuned model. You must have the Owner role in your
 * organization.
 * @param model {String} The model to delete
 * @returns {RequestMethodCaller<DeleteModelResponse>} HTTP 200
 */
export function deleteModelCommand(
  model: string,
): RequestMethodCaller<DeleteModelResponse> {
  const req = {
    method: 'delete' as const,
    pathname: `/models/${model}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createModeration
 *
 *
 * @summary Classifies if text violates OpenAI's Content Policy
 * @param parameters.body {CreateModerationRequest}
 * @returns {RequestMethodCaller<CreateModerationResponse>} HTTP 200
 */
export function createModerationCommand(parameters: {
  body: Simplify<CreateModerationRequest>;
}): RequestMethodCaller<CreateModerationResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/moderations`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}
