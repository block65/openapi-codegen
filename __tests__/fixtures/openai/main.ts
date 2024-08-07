/**
 * This file was auto generated by @block65/openapi-codegen
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2024-07-20T05:47:37.293Z
 *
 */
import {
  RestServiceClient,
  createIsomorphicNativeFetcher,
  type RestServiceClientConfig,
} from '@block65/rest-client';
import type {
  AssistantFileObject,
  AssistantObject,
  CancelFineTuneCommandInput,
  CancelFineTuningJobCommandInput,
  CancelRunCommandInput,
  CreateAssistantCommandInput,
  CreateAssistantFileCommandInput,
  CreateChatCompletionCommandInput,
  CreateChatCompletionResponse,
  CreateCompletionCommandInput,
  CreateCompletionResponse,
  CreateEditCommandInput,
  CreateEditResponse,
  CreateEmbeddingCommandInput,
  CreateEmbeddingResponse,
  CreateFileCommandInput,
  CreateFineTuneCommandInput,
  CreateFineTuningJobCommandInput,
  CreateImageCommandInput,
  CreateImageEditCommandInput,
  CreateImageVariationCommandInput,
  CreateMessageCommandInput,
  CreateModerationCommandInput,
  CreateModerationResponse,
  CreateRunCommandInput,
  CreateSpeechCommandInput,
  CreateThreadAndRunCommandInput,
  CreateThreadCommandInput,
  CreateTranscriptionCommandInput,
  CreateTranscriptionResponse,
  CreateTranslationCommandInput,
  CreateTranslationResponse,
  DeleteAssistantCommandInput,
  DeleteAssistantFileCommandInput,
  DeleteAssistantFileResponse,
  DeleteAssistantResponse,
  DeleteFileCommandInput,
  DeleteFileResponse,
  DeleteModelCommandInput,
  DeleteModelResponse,
  DeleteThreadCommandInput,
  DeleteThreadResponse,
  DownloadFileCommandInput,
  FineTune,
  FineTuningJob,
  GetAssistantCommandInput,
  GetAssistantFileCommandInput,
  GetMessageCommandInput,
  GetMessageFileCommandInput,
  GetRunCommandInput,
  GetRunStepCommandInput,
  GetThreadCommandInput,
  ImagesResponse,
  ListAssistantFilesCommandInput,
  ListAssistantFilesResponse,
  ListAssistantsCommandInput,
  ListAssistantsResponse,
  ListFilesCommandInput,
  ListFilesResponse,
  ListFineTuneEventsCommandInput,
  ListFineTuneEventsResponse,
  ListFineTunesCommandInput,
  ListFineTunesResponse,
  ListFineTuningEventsCommandInput,
  ListFineTuningJobEventsResponse,
  ListMessageFilesCommandInput,
  ListMessageFilesResponse,
  ListMessagesCommandInput,
  ListMessagesResponse,
  ListModelsCommandInput,
  ListModelsResponse,
  ListPaginatedFineTuningJobsCommandInput,
  ListPaginatedFineTuningJobsResponse,
  ListRunsCommandInput,
  ListRunsResponse,
  ListRunStepsCommandInput,
  ListRunStepsResponse,
  MessageFileObject,
  MessageObject,
  Model,
  ModifyAssistantCommandInput,
  ModifyMessageCommandInput,
  ModifyRunCommandInput,
  ModifyThreadCommandInput,
  OpenAiFile,
  RetrieveFileCommandInput,
  RetrieveFineTuneCommandInput,
  RetrieveFineTuningJobCommandInput,
  RetrieveModelCommandInput,
  RunObject,
  RunStepObject,
  SubmitToolOuputsToRunCommandInput,
  ThreadObject,
} from './types.js';

type AllInputs =
  | CancelFineTuneCommandInput
  | CancelFineTuningJobCommandInput
  | CancelRunCommandInput
  | CreateAssistantCommandInput
  | CreateAssistantFileCommandInput
  | CreateChatCompletionCommandInput
  | CreateCompletionCommandInput
  | CreateEditCommandInput
  | CreateEmbeddingCommandInput
  | CreateFileCommandInput
  | CreateFineTuneCommandInput
  | CreateFineTuningJobCommandInput
  | CreateImageCommandInput
  | CreateImageEditCommandInput
  | CreateImageVariationCommandInput
  | CreateMessageCommandInput
  | CreateModerationCommandInput
  | CreateRunCommandInput
  | CreateSpeechCommandInput
  | CreateThreadAndRunCommandInput
  | CreateThreadCommandInput
  | CreateTranscriptionCommandInput
  | CreateTranslationCommandInput
  | DeleteAssistantCommandInput
  | DeleteAssistantFileCommandInput
  | DeleteFileCommandInput
  | DeleteModelCommandInput
  | DeleteThreadCommandInput
  | DownloadFileCommandInput
  | GetAssistantCommandInput
  | GetAssistantFileCommandInput
  | GetMessageCommandInput
  | GetMessageFileCommandInput
  | GetRunCommandInput
  | GetRunStepCommandInput
  | GetThreadCommandInput
  | ListAssistantFilesCommandInput
  | ListAssistantsCommandInput
  | ListFilesCommandInput
  | ListFineTuneEventsCommandInput
  | ListFineTunesCommandInput
  | ListFineTuningEventsCommandInput
  | ListMessageFilesCommandInput
  | ListMessagesCommandInput
  | ListModelsCommandInput
  | ListPaginatedFineTuningJobsCommandInput
  | ListRunsCommandInput
  | ListRunStepsCommandInput
  | ModifyAssistantCommandInput
  | ModifyMessageCommandInput
  | ModifyRunCommandInput
  | ModifyThreadCommandInput
  | RetrieveFileCommandInput
  | RetrieveFineTuneCommandInput
  | RetrieveFineTuningJobCommandInput
  | RetrieveModelCommandInput
  | SubmitToolOuputsToRunCommandInput;
type AllOutputs =
  | AssistantFileObject
  | AssistantObject
  | CreateChatCompletionResponse
  | CreateCompletionResponse
  | CreateEditResponse
  | CreateEmbeddingResponse
  | CreateModerationResponse
  | CreateTranscriptionResponse
  | CreateTranslationResponse
  | DeleteAssistantFileResponse
  | DeleteAssistantResponse
  | DeleteFileResponse
  | DeleteModelResponse
  | DeleteThreadResponse
  | FineTune
  | FineTuningJob
  | ImagesResponse
  | ListAssistantFilesResponse
  | ListAssistantsResponse
  | ListFilesResponse
  | ListFineTuneEventsResponse
  | ListFineTunesResponse
  | ListFineTuningJobEventsResponse
  | ListMessageFilesResponse
  | ListMessagesResponse
  | ListModelsResponse
  | ListPaginatedFineTuningJobsResponse
  | ListRunsResponse
  | ListRunStepsResponse
  | MessageFileObject
  | MessageObject
  | Model
  | never
  | OpenAiFile
  | RunObject
  | RunStepObject
  | ThreadObject;

export class OpenAiApiRestClient extends RestServiceClient<
  AllInputs,
  AllOutputs
> {
  constructor(
    baseUrl = new URL('https://api.openai.com/v1/'),
    fetcher = createIsomorphicNativeFetcher(),
    config?: RestServiceClientConfig,
  ) {
    super(baseUrl, fetcher, config);
  }
}
