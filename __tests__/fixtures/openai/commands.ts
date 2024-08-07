/**
 * This file was auto generated by @block65/openapi-codegen
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2024-07-20T05:47:37.293Z
 *
 */
/** eslint-disable max-classes */
import { Command } from '@block65/rest-client';
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
 * CreateChatCompletionCommand
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
 * CreateCompletionCommand
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
 * CreateEditCommand
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
 * CreateImageCommand
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
 * CreateImageEditCommand
 *
 * @summary Creates an edited or extended image given an original image and a prompt.
 */
export class CreateImageEditCommand extends Command<
  never,
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
 * CreateImageVariationCommand
 *
 * @summary Creates a variation of a given image.
 */
export class CreateImageVariationCommand extends Command<
  never,
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
 * CreateEmbeddingCommand
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
 * CreateSpeechCommand
 *
 * @summary Generates audio from the input text.
 */
export class CreateSpeechCommand extends Command<
  CreateSpeechCommandInput,
  never,
  CreateSpeechCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateSpeechCommandInput) {
    const body = input;
    super(`/audio/speech`, body);
  }
}

/**
 * CreateTranscriptionCommand
 *
 * @summary Transcribes audio into the input language.
 */
export class CreateTranscriptionCommand extends Command<
  never,
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
 * CreateTranslationCommand
 *
 * @summary Translates audio into English.
 */
export class CreateTranslationCommand extends Command<
  never,
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
 * ListFilesCommand
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
 * CreateFileCommand
 *
 * @summary Upload a file that can be used across various endpoints. The size of all
 * the files uploaded by one organization can be up to 100 GB.
 *
 * The size of individual files can be a maximum of 512 MB. See the
 * [Assistants Tools guide](/docs/assistants/tools) to learn more about the
 * types of files supported. The Fine-tuning API only supports `.jsonl` files.
 *
 * Please [contact us](https://help.openai.com/) if you need to increase these
 * storage limits.
 */
export class CreateFileCommand extends Command<
  never,
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
 * DeleteFileCommand
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
 * RetrieveFileCommand
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
 * DownloadFileCommand
 *
 * @summary Returns the contents of the specified file.
 */
export class DownloadFileCommand extends Command<
  DownloadFileCommandInput,
  never,
  DownloadFileCommandBody
> {
  public override method = 'get' as const;

  constructor(input: DownloadFileCommandInput) {
    const { fileId } = input;
    super(`/files/${fileId}/content`);
  }
}

/**
 * CreateFineTuningJobCommand
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
 * ListPaginatedFineTuningJobsCommand
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
 * RetrieveFineTuningJobCommand
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
 * ListFineTuningEventsCommand
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
 * CancelFineTuningJobCommand
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
 * CreateFineTuneCommand
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
 * ListFineTunesCommand
 *
 * @summary List your organization's fine-tuning jobs
 * @deprecated
 */
export class ListFineTunesCommand extends Command<
  never,
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
 * RetrieveFineTuneCommand
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
 * CancelFineTuneCommand
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
 * ListFineTuneEventsCommand
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
 * ListModelsCommand
 *
 * @summary Lists the currently available models, and provides basic information about
 * each one such as the owner and availability.
 */
export class ListModelsCommand extends Command<
  never,
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
 * RetrieveModelCommand
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
 * DeleteModelCommand
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
 * CreateModerationCommand
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
 * ListAssistantsCommand
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
 * CreateAssistantCommand
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
 * GetAssistantCommand
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
 * ModifyAssistantCommand
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
 * DeleteAssistantCommand
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
 * CreateThreadCommand
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
 * GetThreadCommand
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
 * ModifyThreadCommand
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
 * DeleteThreadCommand
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
 * ListMessagesCommand
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
 * CreateMessageCommand
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
 * GetMessageCommand
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
 * ModifyMessageCommand
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
 * CreateThreadAndRunCommand
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
 * ListRunsCommand
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
 * CreateRunCommand
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
 * GetRunCommand
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
 * ModifyRunCommand
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
 * SubmitToolOuputsToRunCommand
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
 * CancelRunCommand
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
 * ListRunStepsCommand
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
 * GetRunStepCommand
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
 * ListAssistantFilesCommand
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
 * CreateAssistantFileCommand
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
 * GetAssistantFileCommand
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
 * DeleteAssistantFileCommand
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
 * ListMessageFilesCommand
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
 * GetMessageFileCommand
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
