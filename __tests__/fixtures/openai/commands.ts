import { Command } from '@block65/rest-client';
import type { RequestMethodCaller } from '@block65/rest-client';
import type { Jsonifiable } from 'type-fest';
import type {
  CreateChatCompletionRequest,
  CreateChatCompletionCommandInput,
  CreateChatCompletionCommandBody,
  CreateChatCompletionResponse,
  CreateCompletionRequest,
  CreateCompletionCommandInput,
  CreateCompletionCommandBody,
  CreateCompletionResponse,
  CreateEditRequest,
  CreateEditCommandInput,
  CreateEditCommandBody,
  CreateEditResponse,
  CreateImageRequest,
  CreateImageCommandInput,
  CreateImageCommandBody,
  ImagesResponse,
  CreateImageEditCommandInput,
  CreateImageEditCommandBody,
  CreateImageVariationCommandInput,
  CreateImageVariationCommandBody,
  CreateEmbeddingRequest,
  CreateEmbeddingCommandInput,
  CreateEmbeddingCommandBody,
  CreateEmbeddingResponse,
  CreateSpeechRequest,
  CreateSpeechCommandInput,
  CreateSpeechCommandBody,
  CreateTranscriptionCommandInput,
  CreateTranscriptionCommandBody,
  CreateTranscriptionResponse,
  CreateTranslationCommandInput,
  CreateTranslationCommandBody,
  CreateTranslationResponse,
  ListFilesCommandQuery,
  ListFilesCommandInput,
  ListFilesCommandBody,
  ListFilesResponse,
  CreateFileCommandInput,
  CreateFileCommandBody,
  OpenAiFile,
  DeleteFileCommandInput,
  DeleteFileCommandBody,
  DeleteFileResponse,
  RetrieveFileCommandInput,
  RetrieveFileCommandBody,
  DownloadFileCommandInput,
  DownloadFileCommandBody,
  CreateFineTuningJobRequest,
  CreateFineTuningJobCommandInput,
  CreateFineTuningJobCommandBody,
  FineTuningJob,
  ListPaginatedFineTuningJobsCommandQuery,
  ListPaginatedFineTuningJobsCommandInput,
  ListPaginatedFineTuningJobsCommandBody,
  ListPaginatedFineTuningJobsResponse,
  RetrieveFineTuningJobCommandInput,
  RetrieveFineTuningJobCommandBody,
  ListFineTuningEventsCommandQuery,
  ListFineTuningEventsCommandInput,
  ListFineTuningEventsCommandBody,
  ListFineTuningJobEventsResponse,
  CancelFineTuningJobCommandInput,
  CancelFineTuningJobCommandBody,
  CreateFineTuneRequest,
  CreateFineTuneCommandInput,
  CreateFineTuneCommandBody,
  FineTune,
  ListFineTunesCommandInput,
  ListFineTunesCommandBody,
  ListFineTunesResponse,
  RetrieveFineTuneCommandInput,
  RetrieveFineTuneCommandBody,
  CancelFineTuneCommandInput,
  CancelFineTuneCommandBody,
  ListFineTuneEventsCommandQuery,
  ListFineTuneEventsCommandInput,
  ListFineTuneEventsCommandBody,
  ListFineTuneEventsResponse,
  ListModelsCommandInput,
  ListModelsCommandBody,
  ListModelsResponse,
  RetrieveModelCommandInput,
  RetrieveModelCommandBody,
  Model,
  DeleteModelCommandInput,
  DeleteModelCommandBody,
  DeleteModelResponse,
  CreateModerationRequest,
  CreateModerationCommandInput,
  CreateModerationCommandBody,
  CreateModerationResponse,
  ListAssistantsCommandQuery,
  ListAssistantsCommandInput,
  ListAssistantsCommandBody,
  ListAssistantsResponse,
  CreateAssistantRequest,
  CreateAssistantCommandInput,
  CreateAssistantCommandBody,
  AssistantObject,
  GetAssistantCommandInput,
  GetAssistantCommandBody,
  ModifyAssistantRequest,
  ModifyAssistantCommandInput,
  ModifyAssistantCommandBody,
  DeleteAssistantCommandInput,
  DeleteAssistantCommandBody,
  DeleteAssistantResponse,
  CreateThreadRequest,
  CreateThreadCommandInput,
  CreateThreadCommandBody,
  ThreadObject,
  GetThreadCommandInput,
  GetThreadCommandBody,
  ModifyThreadRequest,
  ModifyThreadCommandInput,
  ModifyThreadCommandBody,
  DeleteThreadCommandInput,
  DeleteThreadCommandBody,
  DeleteThreadResponse,
  ListMessagesCommandQuery,
  ListMessagesCommandInput,
  ListMessagesCommandBody,
  ListMessagesResponse,
  CreateMessageRequest,
  CreateMessageCommandInput,
  CreateMessageCommandBody,
  MessageObject,
  GetMessageCommandInput,
  GetMessageCommandBody,
  ModifyMessageRequest,
  ModifyMessageCommandInput,
  ModifyMessageCommandBody,
  CreateThreadAndRunRequest,
  CreateThreadAndRunCommandInput,
  CreateThreadAndRunCommandBody,
  RunObject,
  ListRunsCommandQuery,
  ListRunsCommandInput,
  ListRunsCommandBody,
  ListRunsResponse,
  CreateRunRequest,
  CreateRunCommandInput,
  CreateRunCommandBody,
  GetRunCommandInput,
  GetRunCommandBody,
  ModifyRunRequest,
  ModifyRunCommandInput,
  ModifyRunCommandBody,
  SubmitToolOutputsRunRequest,
  SubmitToolOuputsToRunCommandInput,
  SubmitToolOuputsToRunCommandBody,
  CancelRunCommandInput,
  CancelRunCommandBody,
  ListRunStepsCommandQuery,
  ListRunStepsCommandInput,
  ListRunStepsCommandBody,
  ListRunStepsResponse,
  GetRunStepCommandInput,
  GetRunStepCommandBody,
  RunStepObject,
  ListAssistantFilesCommandQuery,
  ListAssistantFilesCommandInput,
  ListAssistantFilesCommandBody,
  ListAssistantFilesResponse,
  CreateAssistantFileRequest,
  CreateAssistantFileCommandInput,
  CreateAssistantFileCommandBody,
  AssistantFileObject,
  GetAssistantFileCommandInput,
  GetAssistantFileCommandBody,
  DeleteAssistantFileCommandInput,
  DeleteAssistantFileCommandBody,
  DeleteAssistantFileResponse,
  ListMessageFilesCommandQuery,
  ListMessageFilesCommandInput,
  ListMessageFilesCommandBody,
  ListMessageFilesResponse,
  GetMessageFileCommandInput,
  GetMessageFileCommandBody,
  MessageFileObject,
} from './types.js';

/**
 * createChatCompletion
 *
 *
 * @summary Creates a model response for the given chat conversation.
 * @param parameters.body {CreateChatCompletionRequest}
 * @returns {RequestMethodCaller<CreateChatCompletionResponse>} HTTP 200
 */
export function createChatCompletionCommand(parameters: {
  body: CreateChatCompletionRequest;
}): RequestMethodCaller<CreateChatCompletionResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/chat/completions`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createChatCompletion
 *
 *
 * @summary Creates a model response for the given chat conversation.
 */
export class CreateChatCompletionCommand extends Command<
  CreateChatCompletionCommandInput,
  CreateChatCompletionResponse,
  CreateChatCompletionCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateChatCompletionCommandInput) {
    const body = input;
    super(`/chat/completions`, body);
  }
}

/**
 * createCompletion
 *
 *
 * @summary Creates a completion for the provided prompt and parameters.
 * @param parameters.body {CreateCompletionRequest}
 * @returns {RequestMethodCaller<CreateCompletionResponse>} HTTP 200
 */
export function createCompletionCommand(parameters: {
  body: CreateCompletionRequest;
}): RequestMethodCaller<CreateCompletionResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/completions`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createCompletion
 *
 *
 * @summary Creates a completion for the provided prompt and parameters.
 */
export class CreateCompletionCommand extends Command<
  CreateCompletionCommandInput,
  CreateCompletionResponse,
  CreateCompletionCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateCompletionCommandInput) {
    const body = input;
    super(`/completions`, body);
  }
}

/**
 * createEdit
 *
 *
 * @summary Creates a new edit for the provided input, instruction, and parameters.
 * @deprecated
 * @deprecated
 * @param parameters.body {CreateEditRequest}
 * @returns {RequestMethodCaller<CreateEditResponse>} HTTP 200
 */
export function createEditCommand(parameters: {
  body: CreateEditRequest;
}): RequestMethodCaller<CreateEditResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/edits`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createEdit
 *
 *
 * @summary Creates a new edit for the provided input, instruction, and parameters.
 * @deprecated
 */
export class CreateEditCommand extends Command<
  CreateEditCommandInput,
  CreateEditResponse,
  CreateEditCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateEditCommandInput) {
    const body = input;
    super(`/edits`, body);
  }
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
  body: CreateImageRequest;
}): RequestMethodCaller<ImagesResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/images/generations`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createImage
 *
 *
 * @summary Creates an image given a prompt.
 */
export class CreateImageCommand extends Command<
  CreateImageCommandInput,
  ImagesResponse,
  CreateImageCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateImageCommandInput) {
    const body = input;
    super(`/images/generations`, body);
  }
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
 * createImageEdit
 *
 *
 * @summary Creates an edited or extended image given an original image and a prompt.
 */
export class CreateImageEditCommand extends Command<
  void,
  ImagesResponse,
  CreateImageEditCommandBody
> {
  public override method = 'post' as const;

  constructor() {
    // no input parameters
    super(`/images/edits`);
  }
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
 * createImageVariation
 *
 *
 * @summary Creates a variation of a given image.
 */
export class CreateImageVariationCommand extends Command<
  void,
  ImagesResponse,
  CreateImageVariationCommandBody
> {
  public override method = 'post' as const;

  constructor() {
    // no input parameters
    super(`/images/variations`);
  }
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
  body: CreateEmbeddingRequest;
}): RequestMethodCaller<CreateEmbeddingResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/embeddings`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createEmbedding
 *
 *
 * @summary Creates an embedding vector representing the input text.
 */
export class CreateEmbeddingCommand extends Command<
  CreateEmbeddingCommandInput,
  CreateEmbeddingResponse,
  CreateEmbeddingCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateEmbeddingCommandInput) {
    const body = input;
    super(`/embeddings`, body);
  }
}

/**
 * createSpeech
 *
 *
 * @summary Generates audio from the input text.
 * @param parameters.body {CreateSpeechRequest}
 * @returns {RequestMethodCaller<void>} HTTP 200
 */
export function createSpeechCommand(parameters: {
  body: CreateSpeechRequest;
}): RequestMethodCaller<void> {
  const req = {
    method: 'post' as const,
    pathname: `/audio/speech`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createSpeech
 *
 *
 * @summary Generates audio from the input text.
 */
export class CreateSpeechCommand extends Command<
  CreateSpeechCommandInput,
  void,
  CreateSpeechCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateSpeechCommandInput) {
    const body = input;
    super(`/audio/speech`, body);
  }
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
 * createTranscription
 *
 *
 * @summary Transcribes audio into the input language.
 */
export class CreateTranscriptionCommand extends Command<
  void,
  CreateTranscriptionResponse,
  CreateTranscriptionCommandBody
> {
  public override method = 'post' as const;

  constructor() {
    // no input parameters
    super(`/audio/transcriptions`);
  }
}

/**
 * createTranslation
 *
 *
 * @summary Translates audio into English.
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
 * createTranslation
 *
 *
 * @summary Translates audio into English.
 */
export class CreateTranslationCommand extends Command<
  void,
  CreateTranslationResponse,
  CreateTranslationCommandBody
> {
  public override method = 'post' as const;

  constructor() {
    // no input parameters
    super(`/audio/translations`);
  }
}

/**
 * listFiles
 *
 *
 * @summary Returns a list of files that belong to the user's organization.
 * @param parameters.query.purpose? {String} Only return files with the given
 * purpose.
 * @returns {RequestMethodCaller<ListFilesResponse>} HTTP 200
 */
export function listFilesCommand(parameters?: {
  query?: ListFilesCommandQuery;
}): RequestMethodCaller<ListFilesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/files`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listFiles
 *
 *
 * @summary Returns a list of files that belong to the user's organization.
 */
export class ListFilesCommand extends Command<
  ListFilesCommandInput,
  ListFilesResponse,
  ListFilesCommandBody,
  ListFilesCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListFilesCommandInput) {
    const { purpose, ...body } = input;
    super(`/files`, undefined, { purpose });
  }
}

/**
 * createFile
 *
 *
 * @summary Upload a file that can be used across various endpoints/features. The size
 * of all the files uploaded by one organization can be up to 100 GB.
 *
 * The size of individual files for can be a maximum of 512MB. See the
 * [Assistants Tools guide](/docs/assistants/tools) to learn more about the
 * types of files supported. The Fine-tuning API only supports `.jsonl` files.
 *
 * Please [contact us](https://help.openai.com/) if you need to increase these
 * storage limits.
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
 * createFile
 *
 *
 * @summary Upload a file that can be used across various endpoints/features. The size
 * of all the files uploaded by one organization can be up to 100 GB.
 *
 * The size of individual files for can be a maximum of 512MB. See the
 * [Assistants Tools guide](/docs/assistants/tools) to learn more about the
 * types of files supported. The Fine-tuning API only supports `.jsonl` files.
 *
 * Please [contact us](https://help.openai.com/) if you need to increase these
 * storage limits.
 */
export class CreateFileCommand extends Command<
  void,
  OpenAiFile,
  CreateFileCommandBody
> {
  public override method = 'post' as const;

  constructor() {
    // no input parameters
    super(`/files`);
  }
}

/**
 * deleteFile
 *
 *
 * @summary Delete a file.
 * @param fileId {String} The ID of the file to use for this request.
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
 * deleteFile
 *
 *
 * @summary Delete a file.
 */
export class DeleteFileCommand extends Command<
  DeleteFileCommandInput,
  DeleteFileResponse,
  DeleteFileCommandBody
> {
  public override method = 'delete' as const;

  constructor(input: DeleteFileCommandInput) {
    const { fileId } = input;
    super(`/files/${fileId}`);
  }
}

/**
 * retrieveFile
 *
 *
 * @summary Returns information about a specific file.
 * @param fileId {String} The ID of the file to use for this request.
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
 * retrieveFile
 *
 *
 * @summary Returns information about a specific file.
 */
export class RetrieveFileCommand extends Command<
  RetrieveFileCommandInput,
  OpenAiFile,
  RetrieveFileCommandBody
> {
  public override method = 'get' as const;

  constructor(input: RetrieveFileCommandInput) {
    const { fileId } = input;
    super(`/files/${fileId}`);
  }
}

/**
 * downloadFile
 *
 *
 * @summary Returns the contents of the specified file.
 * @param fileId {String} The ID of the file to use for this request.
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
 * downloadFile
 *
 *
 * @summary Returns the contents of the specified file.
 */
export class DownloadFileCommand extends Command<
  DownloadFileCommandInput,
  void,
  DownloadFileCommandBody
> {
  public override method = 'get' as const;

  constructor(input: DownloadFileCommandInput) {
    const { fileId } = input;
    super(`/files/${fileId}/content`);
  }
}

/**
 * createFineTuningJob
 *
 *
 * @summary Creates a job that fine-tunes a specified model from a given dataset.
 *
 * Response includes details of the enqueued job including job status and the
 * name of the fine-tuned models once complete.
 *
 * [Learn more about fine-tuning](/docs/guides/fine-tuning)
 * @param parameters.body {CreateFineTuningJobRequest}
 * @returns {RequestMethodCaller<FineTuningJob>} HTTP 200
 */
export function createFineTuningJobCommand(parameters: {
  body: CreateFineTuningJobRequest;
}): RequestMethodCaller<FineTuningJob> {
  const req = {
    method: 'post' as const,
    pathname: `/fine_tuning/jobs`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createFineTuningJob
 *
 *
 * @summary Creates a job that fine-tunes a specified model from a given dataset.
 *
 * Response includes details of the enqueued job including job status and the
 * name of the fine-tuned models once complete.
 *
 * [Learn more about fine-tuning](/docs/guides/fine-tuning)
 */
export class CreateFineTuningJobCommand extends Command<
  CreateFineTuningJobCommandInput,
  FineTuningJob,
  CreateFineTuningJobCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateFineTuningJobCommandInput) {
    const body = input;
    super(`/fine_tuning/jobs`, body);
  }
}

/**
 * listPaginatedFineTuningJobs
 *
 *
 * @summary List your organization's fine-tuning jobs
 * @param parameters.query.after? {String} Identifier for the last job from the
 * previous pagination request.
 * @param parameters.query.limit? {String} Number of fine-tuning jobs to retrieve.
 * @returns {RequestMethodCaller<ListPaginatedFineTuningJobsResponse>} HTTP 200
 */
export function listPaginatedFineTuningJobsCommand(parameters?: {
  query?: ListPaginatedFineTuningJobsCommandQuery;
}): RequestMethodCaller<ListPaginatedFineTuningJobsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/fine_tuning/jobs`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listPaginatedFineTuningJobs
 *
 *
 * @summary List your organization's fine-tuning jobs
 */
export class ListPaginatedFineTuningJobsCommand extends Command<
  ListPaginatedFineTuningJobsCommandInput,
  ListPaginatedFineTuningJobsResponse,
  ListPaginatedFineTuningJobsCommandBody,
  ListPaginatedFineTuningJobsCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListPaginatedFineTuningJobsCommandInput) {
    const { after, limit, ...body } = input;
    super(`/fine_tuning/jobs`, undefined, { after, limit });
  }
}

/**
 * retrieveFineTuningJob
 *
 *
 * @summary Get info about a fine-tuning job.
 *
 * [Learn more about fine-tuning](/docs/guides/fine-tuning)
 * @param fineTuningJobId {String} The ID of the fine-tuning job.
 * @returns {RequestMethodCaller<FineTuningJob>} HTTP 200
 */
export function retrieveFineTuningJobCommand(
  fineTuningJobId: string,
): RequestMethodCaller<FineTuningJob> {
  const req = {
    method: 'get' as const,
    pathname: `/fine_tuning/jobs/${fineTuningJobId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * retrieveFineTuningJob
 *
 *
 * @summary Get info about a fine-tuning job.
 *
 * [Learn more about fine-tuning](/docs/guides/fine-tuning)
 */
export class RetrieveFineTuningJobCommand extends Command<
  RetrieveFineTuningJobCommandInput,
  FineTuningJob,
  RetrieveFineTuningJobCommandBody
> {
  public override method = 'get' as const;

  constructor(input: RetrieveFineTuningJobCommandInput) {
    const { fineTuningJobId } = input;
    super(`/fine_tuning/jobs/${fineTuningJobId}`);
  }
}

/**
 * listFineTuningEvents
 *
 *
 * @summary Get status updates for a fine-tuning job.
 * @param fineTuningJobId {String} The ID of the fine-tuning job to get events for.
 * @param parameters.query.after? {String} Identifier for the last event from the
 * previous pagination request.
 * @param parameters.query.limit? {String} Number of events to retrieve.
 * @returns {RequestMethodCaller<ListFineTuningJobEventsResponse>} HTTP 200
 */
export function listFineTuningEventsCommand(
  fineTuningJobId: string,
  parameters?: {
    query?: ListFineTuningEventsCommandQuery;
  },
): RequestMethodCaller<ListFineTuningJobEventsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/fine_tuning/jobs/${fineTuningJobId}/events`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listFineTuningEvents
 *
 *
 * @summary Get status updates for a fine-tuning job.
 */
export class ListFineTuningEventsCommand extends Command<
  ListFineTuningEventsCommandInput,
  ListFineTuningJobEventsResponse,
  ListFineTuningEventsCommandBody,
  ListFineTuningEventsCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListFineTuningEventsCommandInput) {
    const { fineTuningJobId, after, limit, ...body } = input;
    super(`/fine_tuning/jobs/${fineTuningJobId}/events`, undefined, {
      after,
      limit,
    });
  }
}

/**
 * cancelFineTuningJob
 *
 *
 * @summary Immediately cancel a fine-tune job.
 * @param fineTuningJobId {String} The ID of the fine-tuning job to cancel.
 * @returns {RequestMethodCaller<FineTuningJob>} HTTP 200
 */
export function cancelFineTuningJobCommand(
  fineTuningJobId: string,
): RequestMethodCaller<FineTuningJob> {
  const req = {
    method: 'post' as const,
    pathname: `/fine_tuning/jobs/${fineTuningJobId}/cancel`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * cancelFineTuningJob
 *
 *
 * @summary Immediately cancel a fine-tune job.
 */
export class CancelFineTuningJobCommand extends Command<
  CancelFineTuningJobCommandInput,
  FineTuningJob,
  CancelFineTuningJobCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CancelFineTuningJobCommandInput) {
    const { fineTuningJobId } = input;
    super(`/fine_tuning/jobs/${fineTuningJobId}/cancel`);
  }
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
 * [Learn more about fine-tuning](/docs/guides/legacy-fine-tuning)
 * @deprecated
 * @deprecated
 * @param parameters.body {CreateFineTuneRequest}
 * @returns {RequestMethodCaller<FineTune>} HTTP 200
 */
export function createFineTuneCommand(parameters: {
  body: CreateFineTuneRequest;
}): RequestMethodCaller<FineTune> {
  const req = {
    method: 'post' as const,
    pathname: `/fine-tunes`,
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
 * [Learn more about fine-tuning](/docs/guides/legacy-fine-tuning)
 * @deprecated
 */
export class CreateFineTuneCommand extends Command<
  CreateFineTuneCommandInput,
  FineTune,
  CreateFineTuneCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateFineTuneCommandInput) {
    const body = input;
    super(`/fine-tunes`, body);
  }
}

/**
 * listFineTunes
 *
 *
 * @summary List your organization's fine-tuning jobs
 * @deprecated
 * @deprecated
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
 * listFineTunes
 *
 *
 * @summary List your organization's fine-tuning jobs
 * @deprecated
 */
export class ListFineTunesCommand extends Command<
  void,
  ListFineTunesResponse,
  ListFineTunesCommandBody
> {
  public override method = 'get' as const;

  constructor() {
    // no input parameters
    super(`/fine-tunes`);
  }
}

/**
 * retrieveFineTune
 *
 *
 * @summary Gets info about the fine-tune job.
 *
 * [Learn more about fine-tuning](/docs/guides/legacy-fine-tuning)
 * @deprecated
 * @deprecated
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
 * retrieveFineTune
 *
 *
 * @summary Gets info about the fine-tune job.
 *
 * [Learn more about fine-tuning](/docs/guides/legacy-fine-tuning)
 * @deprecated
 */
export class RetrieveFineTuneCommand extends Command<
  RetrieveFineTuneCommandInput,
  FineTune,
  RetrieveFineTuneCommandBody
> {
  public override method = 'get' as const;

  constructor(input: RetrieveFineTuneCommandInput) {
    const { fineTuneId } = input;
    super(`/fine-tunes/${fineTuneId}`);
  }
}

/**
 * cancelFineTune
 *
 *
 * @summary Immediately cancel a fine-tune job.
 * @deprecated
 * @deprecated
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
 * cancelFineTune
 *
 *
 * @summary Immediately cancel a fine-tune job.
 * @deprecated
 */
export class CancelFineTuneCommand extends Command<
  CancelFineTuneCommandInput,
  FineTune,
  CancelFineTuneCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CancelFineTuneCommandInput) {
    const { fineTuneId } = input;
    super(`/fine-tunes/${fineTuneId}/cancel`);
  }
}

/**
 * listFineTuneEvents
 *
 *
 * @summary Get fine-grained status updates for a fine-tune job.
 * @deprecated
 * @deprecated
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
 * listFineTuneEvents
 *
 *
 * @summary Get fine-grained status updates for a fine-tune job.
 * @deprecated
 */
export class ListFineTuneEventsCommand extends Command<
  ListFineTuneEventsCommandInput,
  ListFineTuneEventsResponse,
  ListFineTuneEventsCommandBody,
  ListFineTuneEventsCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListFineTuneEventsCommandInput) {
    const { fineTuneId, stream, ...body } = input;
    super(`/fine-tunes/${fineTuneId}/events`, undefined, { stream });
  }
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
 * listModels
 *
 *
 * @summary Lists the currently available models, and provides basic information about
 * each one such as the owner and availability.
 */
export class ListModelsCommand extends Command<
  void,
  ListModelsResponse,
  ListModelsCommandBody
> {
  public override method = 'get' as const;

  constructor() {
    // no input parameters
    super(`/models`);
  }
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
 * retrieveModel
 *
 *
 * @summary Retrieves a model instance, providing basic information about the model
 * such as the owner and permissioning.
 */
export class RetrieveModelCommand extends Command<
  RetrieveModelCommandInput,
  Model,
  RetrieveModelCommandBody
> {
  public override method = 'get' as const;

  constructor(input: RetrieveModelCommandInput) {
    const { model } = input;
    super(`/models/${model}`);
  }
}

/**
 * deleteModel
 *
 *
 * @summary Delete a fine-tuned model. You must have the Owner role in your
 * organization to delete a model.
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
 * deleteModel
 *
 *
 * @summary Delete a fine-tuned model. You must have the Owner role in your
 * organization to delete a model.
 */
export class DeleteModelCommand extends Command<
  DeleteModelCommandInput,
  DeleteModelResponse,
  DeleteModelCommandBody
> {
  public override method = 'delete' as const;

  constructor(input: DeleteModelCommandInput) {
    const { model } = input;
    super(`/models/${model}`);
  }
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
  body: CreateModerationRequest;
}): RequestMethodCaller<CreateModerationResponse> {
  const req = {
    method: 'post' as const,
    pathname: `/moderations`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createModeration
 *
 *
 * @summary Classifies if text violates OpenAI's Content Policy
 */
export class CreateModerationCommand extends Command<
  CreateModerationCommandInput,
  CreateModerationResponse,
  CreateModerationCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateModerationCommandInput) {
    const body = input;
    super(`/moderations`, body);
  }
}

/**
 * listAssistants
 *
 *
 * @summary Returns a list of assistants.
 * @param parameters.query.limit? {String} A limit on the number of objects to be
 * returned. Limit can range between 1 and 100, and the default is 20.
 * @param parameters.query.order? {String} Sort order by the `created_at` timestamp
 * of the objects. `asc` for ascending order and `desc` for descending order.
 * @param parameters.query.after? {String} A cursor for use in pagination. `after` is
 * an object ID that defines your place in the list. For instance, if you make
 * a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include after=obj_foo in order to fetch the next page
 * of the list.
 * @param parameters.query.before? {String} A cursor for use in pagination. `before`
 * is an object ID that defines your place in the list. For instance, if you
 * make a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include before=obj_foo in order to fetch the previous
 * page of the list.
 * @returns {RequestMethodCaller<ListAssistantsResponse>} HTTP 200
 */
export function listAssistantsCommand(parameters?: {
  query?: ListAssistantsCommandQuery;
}): RequestMethodCaller<ListAssistantsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/assistants`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listAssistants
 *
 *
 * @summary Returns a list of assistants.
 */
export class ListAssistantsCommand extends Command<
  ListAssistantsCommandInput,
  ListAssistantsResponse,
  ListAssistantsCommandBody,
  ListAssistantsCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListAssistantsCommandInput) {
    const { limit, order, after, before, ...body } = input;
    super(`/assistants`, undefined, { limit, order, after, before });
  }
}

/**
 * createAssistant
 *
 *
 * @summary Create an assistant with a model and instructions.
 * @param parameters.body {CreateAssistantRequest}
 * @returns {RequestMethodCaller<AssistantObject>} HTTP 200
 */
export function createAssistantCommand(parameters: {
  body: CreateAssistantRequest;
}): RequestMethodCaller<AssistantObject> {
  const req = {
    method: 'post' as const,
    pathname: `/assistants`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createAssistant
 *
 *
 * @summary Create an assistant with a model and instructions.
 */
export class CreateAssistantCommand extends Command<
  CreateAssistantCommandInput,
  AssistantObject,
  CreateAssistantCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateAssistantCommandInput) {
    const body = input;
    super(`/assistants`, body);
  }
}

/**
 * getAssistant
 *
 *
 * @summary Retrieves an assistant.
 * @param assistantId {String} The ID of the assistant to retrieve.
 * @returns {RequestMethodCaller<AssistantObject>} HTTP 200
 */
export function getAssistantCommand(
  assistantId: string,
): RequestMethodCaller<AssistantObject> {
  const req = {
    method: 'get' as const,
    pathname: `/assistants/${assistantId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getAssistant
 *
 *
 * @summary Retrieves an assistant.
 */
export class GetAssistantCommand extends Command<
  GetAssistantCommandInput,
  AssistantObject,
  GetAssistantCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetAssistantCommandInput) {
    const { assistantId } = input;
    super(`/assistants/${assistantId}`);
  }
}

/**
 * modifyAssistant
 *
 *
 * @summary Modifies an assistant.
 * @param assistantId {String} The ID of the assistant to modify.
 * @param parameters.body {ModifyAssistantRequest}
 * @returns {RequestMethodCaller<AssistantObject>} HTTP 200
 */
export function modifyAssistantCommand(
  assistantId: string,
  parameters: {
    body: ModifyAssistantRequest;
  },
): RequestMethodCaller<AssistantObject> {
  const req = {
    method: 'post' as const,
    pathname: `/assistants/${assistantId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * modifyAssistant
 *
 *
 * @summary Modifies an assistant.
 */
export class ModifyAssistantCommand extends Command<
  ModifyAssistantCommandInput,
  AssistantObject,
  ModifyAssistantCommandBody
> {
  public override method = 'post' as const;

  constructor(input: ModifyAssistantCommandInput) {
    const { assistantId, ...body } = input;
    super(`/assistants/${assistantId}`, body);
  }
}

/**
 * deleteAssistant
 *
 *
 * @summary Delete an assistant.
 * @param assistantId {String} The ID of the assistant to delete.
 * @returns {RequestMethodCaller<DeleteAssistantResponse>} HTTP 200
 */
export function deleteAssistantCommand(
  assistantId: string,
): RequestMethodCaller<DeleteAssistantResponse> {
  const req = {
    method: 'delete' as const,
    pathname: `/assistants/${assistantId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deleteAssistant
 *
 *
 * @summary Delete an assistant.
 */
export class DeleteAssistantCommand extends Command<
  DeleteAssistantCommandInput,
  DeleteAssistantResponse,
  DeleteAssistantCommandBody
> {
  public override method = 'delete' as const;

  constructor(input: DeleteAssistantCommandInput) {
    const { assistantId } = input;
    super(`/assistants/${assistantId}`);
  }
}

/**
 * createThread
 *
 *
 * @summary Create a thread.
 * @param parameters.body {CreateThreadRequest}
 * @returns {RequestMethodCaller<ThreadObject>} HTTP 200
 */
export function createThreadCommand(parameters: {
  body: CreateThreadRequest;
}): RequestMethodCaller<ThreadObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createThread
 *
 *
 * @summary Create a thread.
 */
export class CreateThreadCommand extends Command<
  CreateThreadCommandInput,
  ThreadObject,
  CreateThreadCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateThreadCommandInput) {
    const body = input;
    super(`/threads`, body);
  }
}

/**
 * getThread
 *
 *
 * @summary Retrieves a thread.
 * @param threadId {String} The ID of the thread to retrieve.
 * @returns {RequestMethodCaller<ThreadObject>} HTTP 200
 */
export function getThreadCommand(
  threadId: string,
): RequestMethodCaller<ThreadObject> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getThread
 *
 *
 * @summary Retrieves a thread.
 */
export class GetThreadCommand extends Command<
  GetThreadCommandInput,
  ThreadObject,
  GetThreadCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetThreadCommandInput) {
    const { threadId } = input;
    super(`/threads/${threadId}`);
  }
}

/**
 * modifyThread
 *
 *
 * @summary Modifies a thread.
 * @param threadId {String} The ID of the thread to modify. Only the `metadata` can
 * be modified.
 * @param parameters.body {ModifyThreadRequest}
 * @returns {RequestMethodCaller<ThreadObject>} HTTP 200
 */
export function modifyThreadCommand(
  threadId: string,
  parameters: {
    body: ModifyThreadRequest;
  },
): RequestMethodCaller<ThreadObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * modifyThread
 *
 *
 * @summary Modifies a thread.
 */
export class ModifyThreadCommand extends Command<
  ModifyThreadCommandInput,
  ThreadObject,
  ModifyThreadCommandBody
> {
  public override method = 'post' as const;

  constructor(input: ModifyThreadCommandInput) {
    const { threadId, ...body } = input;
    super(`/threads/${threadId}`, body);
  }
}

/**
 * deleteThread
 *
 *
 * @summary Delete a thread.
 * @param threadId {String} The ID of the thread to delete.
 * @returns {RequestMethodCaller<DeleteThreadResponse>} HTTP 200
 */
export function deleteThreadCommand(
  threadId: string,
): RequestMethodCaller<DeleteThreadResponse> {
  const req = {
    method: 'delete' as const,
    pathname: `/threads/${threadId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deleteThread
 *
 *
 * @summary Delete a thread.
 */
export class DeleteThreadCommand extends Command<
  DeleteThreadCommandInput,
  DeleteThreadResponse,
  DeleteThreadCommandBody
> {
  public override method = 'delete' as const;

  constructor(input: DeleteThreadCommandInput) {
    const { threadId } = input;
    super(`/threads/${threadId}`);
  }
}

/**
 * listMessages
 *
 *
 * @summary Returns a list of messages for a given thread.
 * @param threadId {String} The ID of the [thread](/docs/api-reference/threads) the
 * messages belong to.
 * @param parameters.query.limit? {String} A limit on the number of objects to be
 * returned. Limit can range between 1 and 100, and the default is 20.
 * @param parameters.query.order? {String} Sort order by the `created_at` timestamp
 * of the objects. `asc` for ascending order and `desc` for descending order.
 * @param parameters.query.after? {String} A cursor for use in pagination. `after` is
 * an object ID that defines your place in the list. For instance, if you make
 * a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include after=obj_foo in order to fetch the next page
 * of the list.
 * @param parameters.query.before? {String} A cursor for use in pagination. `before`
 * is an object ID that defines your place in the list. For instance, if you
 * make a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include before=obj_foo in order to fetch the previous
 * page of the list.
 * @returns {RequestMethodCaller<ListMessagesResponse>} HTTP 200
 */
export function listMessagesCommand(
  threadId: string,
  parameters?: {
    query?: ListMessagesCommandQuery;
  },
): RequestMethodCaller<ListMessagesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/messages`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listMessages
 *
 *
 * @summary Returns a list of messages for a given thread.
 */
export class ListMessagesCommand extends Command<
  ListMessagesCommandInput,
  ListMessagesResponse,
  ListMessagesCommandBody,
  ListMessagesCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListMessagesCommandInput) {
    const { threadId, limit, order, after, before, ...body } = input;
    super(`/threads/${threadId}/messages`, undefined, {
      limit,
      order,
      after,
      before,
    });
  }
}

/**
 * createMessage
 *
 *
 * @summary Create a message.
 * @param threadId {String} The ID of the [thread](/docs/api-reference/threads) to
 * create a message for.
 * @param parameters.body {CreateMessageRequest}
 * @returns {RequestMethodCaller<MessageObject>} HTTP 200
 */
export function createMessageCommand(
  threadId: string,
  parameters: {
    body: CreateMessageRequest;
  },
): RequestMethodCaller<MessageObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}/messages`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createMessage
 *
 *
 * @summary Create a message.
 */
export class CreateMessageCommand extends Command<
  CreateMessageCommandInput,
  MessageObject,
  CreateMessageCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateMessageCommandInput) {
    const { threadId, ...body } = input;
    super(`/threads/${threadId}/messages`, body);
  }
}

/**
 * getMessage
 *
 *
 * @summary Retrieve a message.
 * @param threadId {String} The ID of the [thread](/docs/api-reference/threads) to
 * which this message belongs.
 * @param messageId {String} The ID of the message to retrieve.
 * @returns {RequestMethodCaller<MessageObject>} HTTP 200
 */
export function getMessageCommand(
  threadId: string,
  messageId: string,
): RequestMethodCaller<MessageObject> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/messages/${messageId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getMessage
 *
 *
 * @summary Retrieve a message.
 */
export class GetMessageCommand extends Command<
  GetMessageCommandInput,
  MessageObject,
  GetMessageCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetMessageCommandInput) {
    const { threadId, messageId } = input;
    super(`/threads/${threadId}/messages/${messageId}`);
  }
}

/**
 * modifyMessage
 *
 *
 * @summary Modifies a message.
 * @param threadId {String} The ID of the thread to which this message belongs.
 * @param messageId {String} The ID of the message to modify.
 * @param parameters.body {ModifyMessageRequest}
 * @returns {RequestMethodCaller<MessageObject>} HTTP 200
 */
export function modifyMessageCommand(
  threadId: string,
  messageId: string,
  parameters: {
    body: ModifyMessageRequest;
  },
): RequestMethodCaller<MessageObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}/messages/${messageId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * modifyMessage
 *
 *
 * @summary Modifies a message.
 */
export class ModifyMessageCommand extends Command<
  ModifyMessageCommandInput,
  MessageObject,
  ModifyMessageCommandBody
> {
  public override method = 'post' as const;

  constructor(input: ModifyMessageCommandInput) {
    const { threadId, messageId, ...body } = input;
    super(`/threads/${threadId}/messages/${messageId}`, body);
  }
}

/**
 * createThreadAndRun
 *
 *
 * @summary Create a thread and run it in one request.
 * @param parameters.body {CreateThreadAndRunRequest}
 * @returns {RequestMethodCaller<RunObject>} HTTP 200
 */
export function createThreadAndRunCommand(parameters: {
  body: CreateThreadAndRunRequest;
}): RequestMethodCaller<RunObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/runs`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createThreadAndRun
 *
 *
 * @summary Create a thread and run it in one request.
 */
export class CreateThreadAndRunCommand extends Command<
  CreateThreadAndRunCommandInput,
  RunObject,
  CreateThreadAndRunCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateThreadAndRunCommandInput) {
    const body = input;
    super(`/threads/runs`, body);
  }
}

/**
 * listRuns
 *
 *
 * @summary Returns a list of runs belonging to a thread.
 * @param threadId {String} The ID of the thread the run belongs to.
 * @param parameters.query.limit? {String} A limit on the number of objects to be
 * returned. Limit can range between 1 and 100, and the default is 20.
 * @param parameters.query.order? {String} Sort order by the `created_at` timestamp
 * of the objects. `asc` for ascending order and `desc` for descending order.
 * @param parameters.query.after? {String} A cursor for use in pagination. `after` is
 * an object ID that defines your place in the list. For instance, if you make
 * a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include after=obj_foo in order to fetch the next page
 * of the list.
 * @param parameters.query.before? {String} A cursor for use in pagination. `before`
 * is an object ID that defines your place in the list. For instance, if you
 * make a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include before=obj_foo in order to fetch the previous
 * page of the list.
 * @returns {RequestMethodCaller<ListRunsResponse>} HTTP 200
 */
export function listRunsCommand(
  threadId: string,
  parameters?: {
    query?: ListRunsCommandQuery;
  },
): RequestMethodCaller<ListRunsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/runs`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listRuns
 *
 *
 * @summary Returns a list of runs belonging to a thread.
 */
export class ListRunsCommand extends Command<
  ListRunsCommandInput,
  ListRunsResponse,
  ListRunsCommandBody,
  ListRunsCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListRunsCommandInput) {
    const { threadId, limit, order, after, before, ...body } = input;
    super(`/threads/${threadId}/runs`, undefined, {
      limit,
      order,
      after,
      before,
    });
  }
}

/**
 * createRun
 *
 *
 * @summary Create a run.
 * @param threadId {String} The ID of the thread to run.
 * @param parameters.body {CreateRunRequest}
 * @returns {RequestMethodCaller<RunObject>} HTTP 200
 */
export function createRunCommand(
  threadId: string,
  parameters: {
    body: CreateRunRequest;
  },
): RequestMethodCaller<RunObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}/runs`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createRun
 *
 *
 * @summary Create a run.
 */
export class CreateRunCommand extends Command<
  CreateRunCommandInput,
  RunObject,
  CreateRunCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateRunCommandInput) {
    const { threadId, ...body } = input;
    super(`/threads/${threadId}/runs`, body);
  }
}

/**
 * getRun
 *
 *
 * @summary Retrieves a run.
 * @param threadId {String} The ID of the [thread](/docs/api-reference/threads) that
 * was run.
 * @param runId {String} The ID of the run to retrieve.
 * @returns {RequestMethodCaller<RunObject>} HTTP 200
 */
export function getRunCommand(
  threadId: string,
  runId: string,
): RequestMethodCaller<RunObject> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/runs/${runId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getRun
 *
 *
 * @summary Retrieves a run.
 */
export class GetRunCommand extends Command<
  GetRunCommandInput,
  RunObject,
  GetRunCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetRunCommandInput) {
    const { threadId, runId } = input;
    super(`/threads/${threadId}/runs/${runId}`);
  }
}

/**
 * modifyRun
 *
 *
 * @summary Modifies a run.
 * @param threadId {String} The ID of the [thread](/docs/api-reference/threads) that
 * was run.
 * @param runId {String} The ID of the run to modify.
 * @param parameters.body {ModifyRunRequest}
 * @returns {RequestMethodCaller<RunObject>} HTTP 200
 */
export function modifyRunCommand(
  threadId: string,
  runId: string,
  parameters: {
    body: ModifyRunRequest;
  },
): RequestMethodCaller<RunObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}/runs/${runId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * modifyRun
 *
 *
 * @summary Modifies a run.
 */
export class ModifyRunCommand extends Command<
  ModifyRunCommandInput,
  RunObject,
  ModifyRunCommandBody
> {
  public override method = 'post' as const;

  constructor(input: ModifyRunCommandInput) {
    const { threadId, runId, ...body } = input;
    super(`/threads/${threadId}/runs/${runId}`, body);
  }
}

/**
 * submitToolOuputsToRun
 *
 *
 * @summary When a run has the `status: "requires_action"` and `required_action.type`
 * is `submit_tool_outputs`, this endpoint can be used to submit the outputs
 * from the tool calls once they're all completed. All outputs must be
 * submitted in a single request.
 * @param threadId {String} The ID of the [thread](/docs/api-reference/threads) to
 * which this run belongs.
 * @param runId {String} The ID of the run that requires the tool output submission.
 * @param parameters.body {SubmitToolOutputsRunRequest}
 * @returns {RequestMethodCaller<RunObject>} HTTP 200
 */
export function submitToolOuputsToRunCommand(
  threadId: string,
  runId: string,
  parameters: {
    body: SubmitToolOutputsRunRequest;
  },
): RequestMethodCaller<RunObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * submitToolOuputsToRun
 *
 *
 * @summary When a run has the `status: "requires_action"` and `required_action.type`
 * is `submit_tool_outputs`, this endpoint can be used to submit the outputs
 * from the tool calls once they're all completed. All outputs must be
 * submitted in a single request.
 */
export class SubmitToolOuputsToRunCommand extends Command<
  SubmitToolOuputsToRunCommandInput,
  RunObject,
  SubmitToolOuputsToRunCommandBody
> {
  public override method = 'post' as const;

  constructor(input: SubmitToolOuputsToRunCommandInput) {
    const { threadId, runId, ...body } = input;
    super(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, body);
  }
}

/**
 * cancelRun
 *
 *
 * @summary Cancels a run that is `in_progress`.
 * @param threadId {String} The ID of the thread to which this run belongs.
 * @param runId {String} The ID of the run to cancel.
 * @returns {RequestMethodCaller<RunObject>} HTTP 200
 */
export function cancelRunCommand(
  threadId: string,
  runId: string,
): RequestMethodCaller<RunObject> {
  const req = {
    method: 'post' as const,
    pathname: `/threads/${threadId}/runs/${runId}/cancel`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * cancelRun
 *
 *
 * @summary Cancels a run that is `in_progress`.
 */
export class CancelRunCommand extends Command<
  CancelRunCommandInput,
  RunObject,
  CancelRunCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CancelRunCommandInput) {
    const { threadId, runId } = input;
    super(`/threads/${threadId}/runs/${runId}/cancel`);
  }
}

/**
 * listRunSteps
 *
 *
 * @summary Returns a list of run steps belonging to a run.
 * @param threadId {String} The ID of the thread the run and run steps belong to.
 * @param runId {String} The ID of the run the run steps belong to.
 * @param parameters.query.limit? {String} A limit on the number of objects to be
 * returned. Limit can range between 1 and 100, and the default is 20.
 * @param parameters.query.order? {String} Sort order by the `created_at` timestamp
 * of the objects. `asc` for ascending order and `desc` for descending order.
 * @param parameters.query.after? {String} A cursor for use in pagination. `after` is
 * an object ID that defines your place in the list. For instance, if you make
 * a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include after=obj_foo in order to fetch the next page
 * of the list.
 * @param parameters.query.before? {String} A cursor for use in pagination. `before`
 * is an object ID that defines your place in the list. For instance, if you
 * make a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include before=obj_foo in order to fetch the previous
 * page of the list.
 * @returns {RequestMethodCaller<ListRunStepsResponse>} HTTP 200
 */
export function listRunStepsCommand(
  threadId: string,
  runId: string,
  parameters?: {
    query?: ListRunStepsCommandQuery;
  },
): RequestMethodCaller<ListRunStepsResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/runs/${runId}/steps`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listRunSteps
 *
 *
 * @summary Returns a list of run steps belonging to a run.
 */
export class ListRunStepsCommand extends Command<
  ListRunStepsCommandInput,
  ListRunStepsResponse,
  ListRunStepsCommandBody,
  ListRunStepsCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListRunStepsCommandInput) {
    const { threadId, runId, limit, order, after, before, ...body } = input;
    super(`/threads/${threadId}/runs/${runId}/steps`, undefined, {
      limit,
      order,
      after,
      before,
    });
  }
}

/**
 * getRunStep
 *
 *
 * @summary Retrieves a run step.
 * @param threadId {String} The ID of the thread to which the run and run step
 * belongs.
 * @param runId {String} The ID of the run to which the run step belongs.
 * @param stepId {String} The ID of the run step to retrieve.
 * @returns {RequestMethodCaller<RunStepObject>} HTTP 200
 */
export function getRunStepCommand(
  threadId: string,
  runId: string,
  stepId: string,
): RequestMethodCaller<RunStepObject> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/runs/${runId}/steps/${stepId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getRunStep
 *
 *
 * @summary Retrieves a run step.
 */
export class GetRunStepCommand extends Command<
  GetRunStepCommandInput,
  RunStepObject,
  GetRunStepCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetRunStepCommandInput) {
    const { threadId, runId, stepId } = input;
    super(`/threads/${threadId}/runs/${runId}/steps/${stepId}`);
  }
}

/**
 * listAssistantFiles
 *
 *
 * @summary Returns a list of assistant files.
 * @param assistantId {String} The ID of the assistant the file belongs to.
 * @param parameters.query.limit? {String} A limit on the number of objects to be
 * returned. Limit can range between 1 and 100, and the default is 20.
 * @param parameters.query.order? {String} Sort order by the `created_at` timestamp
 * of the objects. `asc` for ascending order and `desc` for descending order.
 * @param parameters.query.after? {String} A cursor for use in pagination. `after` is
 * an object ID that defines your place in the list. For instance, if you make
 * a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include after=obj_foo in order to fetch the next page
 * of the list.
 * @param parameters.query.before? {String} A cursor for use in pagination. `before`
 * is an object ID that defines your place in the list. For instance, if you
 * make a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include before=obj_foo in order to fetch the previous
 * page of the list.
 * @returns {RequestMethodCaller<ListAssistantFilesResponse>} HTTP 200
 */
export function listAssistantFilesCommand(
  assistantId: string,
  parameters?: {
    query?: ListAssistantFilesCommandQuery;
  },
): RequestMethodCaller<ListAssistantFilesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/assistants/${assistantId}/files`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listAssistantFiles
 *
 *
 * @summary Returns a list of assistant files.
 */
export class ListAssistantFilesCommand extends Command<
  ListAssistantFilesCommandInput,
  ListAssistantFilesResponse,
  ListAssistantFilesCommandBody,
  ListAssistantFilesCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListAssistantFilesCommandInput) {
    const { assistantId, limit, order, after, before, ...body } = input;
    super(`/assistants/${assistantId}/files`, undefined, {
      limit,
      order,
      after,
      before,
    });
  }
}

/**
 * createAssistantFile
 *
 *
 * @summary Create an assistant file by attaching a [File](/docs/api-reference/files)
 * to an [assistant](/docs/api-reference/assistants).
 * @param assistantId {String} The ID of the assistant for which to create a File.
 * @param parameters.body {CreateAssistantFileRequest}
 * @returns {RequestMethodCaller<AssistantFileObject>} HTTP 200
 */
export function createAssistantFileCommand(
  assistantId: string,
  parameters: {
    body: CreateAssistantFileRequest;
  },
): RequestMethodCaller<AssistantFileObject> {
  const req = {
    method: 'post' as const,
    pathname: `/assistants/${assistantId}/files`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createAssistantFile
 *
 *
 * @summary Create an assistant file by attaching a [File](/docs/api-reference/files)
 * to an [assistant](/docs/api-reference/assistants).
 */
export class CreateAssistantFileCommand extends Command<
  CreateAssistantFileCommandInput,
  AssistantFileObject,
  CreateAssistantFileCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateAssistantFileCommandInput) {
    const { assistantId, ...body } = input;
    super(`/assistants/${assistantId}/files`, body);
  }
}

/**
 * getAssistantFile
 *
 *
 * @summary Retrieves an AssistantFile.
 * @param assistantId {String} The ID of the assistant who the file belongs to.
 * @param fileId {String} The ID of the file we're getting.
 * @returns {RequestMethodCaller<AssistantFileObject>} HTTP 200
 */
export function getAssistantFileCommand(
  assistantId: string,
  fileId: string,
): RequestMethodCaller<AssistantFileObject> {
  const req = {
    method: 'get' as const,
    pathname: `/assistants/${assistantId}/files/${fileId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getAssistantFile
 *
 *
 * @summary Retrieves an AssistantFile.
 */
export class GetAssistantFileCommand extends Command<
  GetAssistantFileCommandInput,
  AssistantFileObject,
  GetAssistantFileCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetAssistantFileCommandInput) {
    const { assistantId, fileId } = input;
    super(`/assistants/${assistantId}/files/${fileId}`);
  }
}

/**
 * deleteAssistantFile
 *
 *
 * @summary Delete an assistant file.
 * @param assistantId {String} The ID of the assistant that the file belongs to.
 * @param fileId {String} The ID of the file to delete.
 * @returns {RequestMethodCaller<DeleteAssistantFileResponse>} HTTP 200
 */
export function deleteAssistantFileCommand(
  assistantId: string,
  fileId: string,
): RequestMethodCaller<DeleteAssistantFileResponse> {
  const req = {
    method: 'delete' as const,
    pathname: `/assistants/${assistantId}/files/${fileId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deleteAssistantFile
 *
 *
 * @summary Delete an assistant file.
 */
export class DeleteAssistantFileCommand extends Command<
  DeleteAssistantFileCommandInput,
  DeleteAssistantFileResponse,
  DeleteAssistantFileCommandBody
> {
  public override method = 'delete' as const;

  constructor(input: DeleteAssistantFileCommandInput) {
    const { assistantId, fileId } = input;
    super(`/assistants/${assistantId}/files/${fileId}`);
  }
}

/**
 * listMessageFiles
 *
 *
 * @summary Returns a list of message files.
 * @param threadId {String} The ID of the thread that the message and files belong
 * to.
 * @param messageId {String} The ID of the message that the files belongs to.
 * @param parameters.query.limit? {String} A limit on the number of objects to be
 * returned. Limit can range between 1 and 100, and the default is 20.
 * @param parameters.query.order? {String} Sort order by the `created_at` timestamp
 * of the objects. `asc` for ascending order and `desc` for descending order.
 * @param parameters.query.after? {String} A cursor for use in pagination. `after` is
 * an object ID that defines your place in the list. For instance, if you make
 * a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include after=obj_foo in order to fetch the next page
 * of the list.
 * @param parameters.query.before? {String} A cursor for use in pagination. `before`
 * is an object ID that defines your place in the list. For instance, if you
 * make a list request and receive 100 objects, ending with obj_foo, your
 * subsequent call can include before=obj_foo in order to fetch the previous
 * page of the list.
 * @returns {RequestMethodCaller<ListMessageFilesResponse>} HTTP 200
 */
export function listMessageFilesCommand(
  threadId: string,
  messageId: string,
  parameters?: {
    query?: ListMessageFilesCommandQuery;
  },
): RequestMethodCaller<ListMessageFilesResponse> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/messages/${messageId}/files`,
    query: parameters?.query,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listMessageFiles
 *
 *
 * @summary Returns a list of message files.
 */
export class ListMessageFilesCommand extends Command<
  ListMessageFilesCommandInput,
  ListMessageFilesResponse,
  ListMessageFilesCommandBody,
  ListMessageFilesCommandQuery
> {
  public override method = 'get' as const;

  constructor(input: ListMessageFilesCommandInput) {
    const { threadId, messageId, limit, order, after, before, ...body } = input;
    super(`/threads/${threadId}/messages/${messageId}/files`, undefined, {
      limit,
      order,
      after,
      before,
    });
  }
}

/**
 * getMessageFile
 *
 *
 * @summary Retrieves a message file.
 * @param threadId {String} The ID of the thread to which the message and File
 * belong.
 * @param messageId {String} The ID of the message the file belongs to.
 * @param fileId {String} The ID of the file being retrieved.
 * @returns {RequestMethodCaller<MessageFileObject>} HTTP 200
 */
export function getMessageFileCommand(
  threadId: string,
  messageId: string,
  fileId: string,
): RequestMethodCaller<MessageFileObject> {
  const req = {
    method: 'get' as const,
    pathname: `/threads/${threadId}/messages/${messageId}/files/${fileId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getMessageFile
 *
 *
 * @summary Retrieves a message file.
 */
export class GetMessageFileCommand extends Command<
  GetMessageFileCommandInput,
  MessageFileObject,
  GetMessageFileCommandBody
> {
  public override method = 'get' as const;

  constructor(input: GetMessageFileCommandInput) {
    const { threadId, messageId, fileId } = input;
    super(`/threads/${threadId}/messages/${messageId}/files/${fileId}`);
  }
}
