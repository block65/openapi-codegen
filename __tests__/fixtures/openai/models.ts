/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2023-03-29T04:57:23.895Z
 *
 */
export type DeleteModelResponse = {
  id: string;
  object: string;
  deleted: boolean;
};
export type CreateCompletionRequest = {
  model: string;
  /**
   * The prompt(s) to generate completions for, encoded as a string, array of
   * strings, array of tokens, or array of token arrays.
   *
   * Note that <|endoftext|> is the document separator that the model sees
   * during training, so if a prompt is not specified the model will generate as
   * if from the beginning of a new document.
   * @default <|endoftext|>
   */
  prompt?:
    | string
    | undefined
    | string[]
    | number[]
    | number[][]
    | null
    | undefined;
  /**
   * The suffix that comes after a completion of inserted text.
   * @example test.
   */
  suffix?: string | null | undefined;
  /**
   * The maximum number of [tokens](/tokenizer) to generate in the completion.
   *
   * The token count of your prompt plus `max_tokens` cannot exceed the model's
   * context length. Most models have a context length of 2048 tokens (except
   * for the newest models, which support 4096).
   * @default 16
   * @example 16
   */
  max_tokens?: number | null;
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8
   * will make the output more random, while lower values like 0.2 will make it
   * more focused and deterministic.
   *
   * We generally recommend altering this or `top_p` but not both.
   * @default 1
   * @example 1
   */
  temperature?: number | null;
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where
   * the model considers the results of the tokens with top_p probability mass.
   * So 0.1 means only the tokens comprising the top 10% probability mass are
   * considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   * @default 1
   * @example 1
   */
  top_p?: number | null;
  /**
   * How many completions to generate for each prompt.
   *
   * **Note:** Because this parameter generates many completions, it can quickly
   * consume your token quota. Use carefully and ensure that you have reasonable
   * settings for `max_tokens` and `stop`.
   * @default 1
   * @example 1
   */
  n?: number | null;
  stream?: boolean | null | undefined;
  logprobs?: number | null;
  echo?: boolean | null | undefined;
  stop?: string | null | undefined | string[] | null | undefined;
  presence_penalty?: number | null;
  frequency_penalty?: number | null;
  /**
   * Generates `best_of` completions server-side and returns the "best" (the one
   * with the highest log probability per token). Results cannot be streamed.
   *
   * When used with `n`, `best_of` controls the number of candidate completions
   * and `n` specifies how many to return – `best_of` must be greater than `n`.
   *
   * **Note:** Because this parameter generates many completions, it can quickly
   * consume your token quota. Use carefully and ensure that you have reasonable
   * settings for `max_tokens` and `stop`.
   * @default 1
   */
  best_of?: number | null;
  logit_bias?: {} | undefined;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text?: string | undefined;
    index?: number;
    logprobs?:
      | {
          tokens?: string[];
          token_logprobs?: number[];
          top_logprobs?: Array<{}>;
          text_offset?: number[];
        }
      | undefined;
    finish_reason?: string | undefined;
  }>;
  usage?:
    | {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }
    | undefined;
};
export type ChatCompletionRequestMessage = {
  /**
   * The role of the author of this message.
   * @enum system,user,assistant
   */
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string | undefined;
};
export type ChatCompletionResponseMessage = {
  /**
   * The role of the author of this message.
   * @enum system,user,assistant
   */
  role: 'system' | 'user' | 'assistant';
  content: string;
};
export type CreateChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index?: number;
    message?: ChatCompletionResponseMessage | undefined;
    finish_reason?: string | undefined;
  }>;
  usage?:
    | {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }
    | undefined;
};
export type CreateEditRequest = {
  model: string;
  /**
   * The input text to use as a starting point for the edit.
   * @example What day of the wek is it?
   */
  input?: string | null | undefined;
  /**
   * The instruction that tells the model how to edit the prompt.
   * @example Fix the spelling mistakes.
   */
  instruction: string;
  /**
   * How many edits to generate for the input and instruction.
   * @default 1
   * @example 1
   */
  n?: number | null;
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8
   * will make the output more random, while lower values like 0.2 will make it
   * more focused and deterministic.
   *
   * We generally recommend altering this or `top_p` but not both.
   * @default 1
   * @example 1
   */
  temperature?: number | null;
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where
   * the model considers the results of the tokens with top_p probability mass.
   * So 0.1 means only the tokens comprising the top 10% probability mass are
   * considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   * @default 1
   * @example 1
   */
  top_p?: number | null;
};
export type CreateEditResponse = {
  object: string;
  created: number;
  choices: Array<{
    text?: string | undefined;
    index?: number;
    logprobs?:
      | {
          tokens?: string[];
          token_logprobs?: number[];
          top_logprobs?: Array<{}>;
          text_offset?: number[];
        }
      | undefined;
    finish_reason?: string | undefined;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};
export type CreateImageRequest = {
  /**
   * A text description of the desired image(s). The maximum length is 1000
   * characters.
   * @example A cute baby sea otter
   */
  prompt: string;
  /**
   * The number of images to generate. Must be between 1 and 10.
   * @default 1
   * @example 1
   */
  n?: number | null;
  /**
   * The size of the generated images. Must be one of `256x256`, `512x512`, or
   * `1024x1024`.
   * @default 1024x1024
   * @enum 256x256,512x512,1024x1024
   * @example 1024x1024
   */
  size?: '256x256' | '512x512' | '1024x1024' | undefined;
  /**
   * The format in which the generated images are returned. Must be one of `url`
   * or `b64_json`.
   * @default url
   * @enum url,b64_json
   * @example url
   */
  response_format?: 'url' | 'b64_json' | undefined;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type ImagesResponse = {
  created: number;
  data: Array<{
    url?: string | undefined;
    b64_json?: string | undefined;
  }>;
};
export type CreateImageEditRequest = {
  image: string;
  mask?: string | undefined;
  /**
   * A text description of the desired image(s). The maximum length is 1000
   * characters.
   * @example A cute baby sea otter wearing a beret
   */
  prompt: string;
  /**
   * The number of images to generate. Must be between 1 and 10.
   * @default 1
   * @example 1
   */
  n?: number | null;
  /**
   * The size of the generated images. Must be one of `256x256`, `512x512`, or
   * `1024x1024`.
   * @default 1024x1024
   * @enum 256x256,512x512,1024x1024
   * @example 1024x1024
   */
  size?: '256x256' | '512x512' | '1024x1024' | undefined;
  /**
   * The format in which the generated images are returned. Must be one of `url`
   * or `b64_json`.
   * @default url
   * @enum url,b64_json
   * @example url
   */
  response_format?: 'url' | 'b64_json' | undefined;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateImageVariationRequest = {
  image: string;
  /**
   * The number of images to generate. Must be between 1 and 10.
   * @default 1
   * @example 1
   */
  n?: number | null;
  /**
   * The size of the generated images. Must be one of `256x256`, `512x512`, or
   * `1024x1024`.
   * @default 1024x1024
   * @enum 256x256,512x512,1024x1024
   * @example 1024x1024
   */
  size?: '256x256' | '512x512' | '1024x1024' | undefined;
  /**
   * The format in which the generated images are returned. Must be one of `url`
   * or `b64_json`.
   * @default url
   * @enum url,b64_json
   * @example url
   */
  response_format?: 'url' | 'b64_json' | undefined;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateModerationRequest = {
  input: string | string[] | null;
  /**
   * Two content moderations models are available: `text-moderation-stable` and
   * `text-moderation-latest`.
   *
   * The default is `text-moderation-latest` which will be automatically
   * upgraded over time. This ensures you are always using our most accurate
   * model. If you use `text-moderation-stable`, we will provide advanced notice
   * before updating the model. Accuracy of `text-moderation-stable` may be
   * slightly lower than for `text-moderation-latest`.
   * @default text-moderation-latest
   * @example text-moderation-stable
   */
  model?: string | undefined;
};
export type CreateModerationResponse = {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      hate: boolean;
      'hate/threatening': boolean;
      'self-harm': boolean;
      sexual: boolean;
      'sexual/minors': boolean;
      violence: boolean;
      'violence/graphic': boolean;
    };
    category_scores: {
      hate: number;
      'hate/threatening': number;
      'self-harm': number;
      sexual: number;
      'sexual/minors': number;
      violence: number;
      'violence/graphic': number;
    };
  }>;
};
export type CreateSearchRequest = {
  /**
   * Query to search against the documents.
   * @example the president
   */
  query: string;
  /**
   * Up to 200 documents to search over, provided as a list of strings.
   *
   * The maximum document length (in tokens) is 2034 minus the number of tokens
   * in the query.
   *
   * You should specify either `documents` or a `file`, but not both.
   * @example ['White House', 'hospital', 'school']
   */
  documents?: string[];
  file?: string | null | undefined;
  /**
   * The maximum number of documents to be re-ranked and returned by search.
   *
   * This flag only takes effect when `file` is set.
   * @default 200
   */
  max_rerank?: number | null;
  return_metadata?: boolean | null | undefined;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateSearchResponse = {
  object?: string | undefined;
  model?: string | undefined;
  data?: Array<{
    object?: string | undefined;
    document?: number;
    score?: number;
  }>;
};
export type CreateFileRequest = {
  file: string;
  purpose: string;
};
export type DeleteFileResponse = {
  id: string;
  object: string;
  deleted: boolean;
};
export type CreateAnswerRequest = {
  model: string;
  /**
   * Question to get answered.
   * @example What is the capital of Japan?
   */
  question: string;
  /**
   * List of (question, answer) pairs that will help steer the model towards the
   * tone and answer format you'd like. We recommend adding 2 to 3 examples.
   * @example [['What is the capital of Canada?', 'Ottawa'], ['Which province is Ottawa in?', 'Ontario']]
   */
  examples: string[][];
  /**
   * A text snippet containing the contextual information used to generate the
   * answers for the `examples` you provide.
   * @example Ottawa, Canada's capital, is located in the east of southern Ontario, near the city of Montréal and the U.S. border.
   */
  examples_context: string;
  /**
   * List of documents from which the answer for the input `question` should be
   * derived. If this is an empty list, the question will be answered based on
   * the question-answer examples.
   *
   * You should specify either `documents` or a `file`, but not both.
   * @example ['Japan is an island country in East Asia, located in the northwest Pacific Ocean.', 'Tokyo is the capital and most populous prefecture of Japan.']
   */
  documents?: string[];
  file?: string | null | undefined;
  /**
   * ID of the model to use for [Search](/docs/api-reference/searches/create).
   * You can select one of `ada`, `babbage`, `curie`, or `davinci`.
   * @default ada
   */
  search_model?: string | null | undefined;
  /**
   * The maximum number of documents to be ranked by
   * [Search](/docs/api-reference/searches/create) when using `file`. Setting it
   * to a higher value leads to improved accuracy but with increased latency and
   * cost.
   * @default 200
   */
  max_rerank?: number | null;
  temperature?: number | null;
  logprobs?: number | null;
  /**
   * The maximum number of tokens allowed for the generated answer
   * @default 16
   */
  max_tokens?: number | null;
  stop?: string | undefined | string[] | null | undefined;
  /**
   * How many answers to generate for each question.
   * @default 1
   */
  n?: number | null;
  logit_bias?: {} | undefined;
  return_metadata?: boolean | null | undefined;
  return_prompt?: boolean | null | undefined;
  /**
   * If an object name is in the list, we provide the full information of the
   * object; otherwise, we only provide the object ID. Currently we support
   * `completion` and `file` objects for expansion.
   * @default
   */
  expand?: never[];
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateAnswerResponse = {
  object?: string | undefined;
  model?: string | undefined;
  search_model?: string | undefined;
  completion?: string | undefined;
  answers?: string[];
  selected_documents?: Array<{
    document?: number;
    text?: string | undefined;
  }>;
};
export type CreateClassificationRequest = {
  model: string;
  /**
   * Query to be classified.
   * @example The plot is not very attractive.
   */
  query: string;
  /**
   * A list of examples with labels, in the following format:
   *
   * `[["The movie is so interesting.", "Positive"], ["It is quite boring.",
   * "Negative"], ...]`
   *
   * All the label strings will be normalized to be capitalized.
   *
   * You should specify either `examples` or `file`, but not both.
   * @example [['Do not see this film.', 'Negative'], ['Smart, provocative and blisteringly funny.', 'Positive']]
   */
  examples?: string[][];
  file?: string | null | undefined;
  /**
   * The set of categories being classified. If not specified, candidate labels
   * will be automatically collected from the examples you provide. All the
   * label strings will be normalized to be capitalized.
   * @example Positive,Negative
   */
  labels?: string[];
  /**
   * ID of the model to use for [Search](/docs/api-reference/searches/create).
   * You can select one of `ada`, `babbage`, `curie`, or `davinci`.
   * @default ada
   */
  search_model?: string | null | undefined;
  temperature?: number | null;
  logprobs?: number | null;
  /**
   * The maximum number of examples to be ranked by
   * [Search](/docs/api-reference/searches/create) when using `file`. Setting it
   * to a higher value leads to improved accuracy but with increased latency and
   * cost.
   * @default 200
   */
  max_examples?: number | null;
  logit_bias?: {} | undefined;
  return_prompt?: boolean | null | undefined;
  return_metadata?: boolean | null | undefined;
  /**
   * If an object name is in the list, we provide the full information of the
   * object; otherwise, we only provide the object ID. Currently we support
   * `completion` and `file` objects for expansion.
   * @default
   */
  expand?: never[];
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateClassificationResponse = {
  object?: string | undefined;
  model?: string | undefined;
  search_model?: string | undefined;
  completion?: string | undefined;
  label?: string | undefined;
  selected_examples?: Array<{
    document?: number;
    text?: string | undefined;
    label?: string | undefined;
  }>;
};
export type CreateFineTuneRequest = {
  /**
   * The ID of an uploaded file that contains training data.
   *
   * See [upload file](/docs/api-reference/files/upload) for how to upload a
   * file.
   *
   * Your dataset must be formatted as a JSONL file, where each training
   * example is a JSON object with the keys "prompt" and "completion".
   * Additionally, you must upload your file with the purpose `fine-tune`.
   *
   * See the [fine-tuning
   * guide](/docs/guides/fine-tuning/creating-training-data) for more details.
   * @example file-ajSREls59WBbvgSzJSVWxMCB
   */
  training_file: string;
  /**
   * The ID of an uploaded file that contains validation data.
   *
   * If you provide this file, the data is used to generate validation
   * metrics periodically during fine-tuning. These metrics can be viewed in
   * the [fine-tuning results
   * file](/docs/guides/fine-tuning/analyzing-your-fine-tuned-model).
   * Your train and validation data should be mutually exclusive.
   *
   * Your dataset must be formatted as a JSONL file, where each validation
   * example is a JSON object with the keys "prompt" and "completion".
   * Additionally, you must upload your file with the purpose `fine-tune`.
   *
   * See the [fine-tuning
   * guide](/docs/guides/fine-tuning/creating-training-data) for more details.
   * @example file-XjSREls59WBbvgSzJSVWxMCa
   */
  validation_file?: string | null | undefined;
  /**
   * The name of the base model to fine-tune. You can select one of "ada",
   * "babbage", "curie", "davinci", or a fine-tuned model created after
   * 2022-04-21.
   * To learn more about these models, see the
   * [Models](https://platform.openai.com/docs/models) documentation.
   * @default curie
   */
  model?: string | null | undefined;
  /**
   * The number of epochs to train the model for. An epoch refers to one
   * full cycle through the training dataset.
   * @default 4
   */
  n_epochs?: number | null;
  batch_size?: number | null;
  learning_rate_multiplier?: number | null;
  /**
   * The weight to use for loss on the prompt tokens. This controls how
   * much the model tries to learn to generate the prompt (as compared
   * to the completion which always has a weight of 1.0), and can add
   * a stabilizing effect to training when completions are short.
   *
   * If prompts are extremely long (relative to completions), it may make
   * sense to reduce this weight so as to avoid over-prioritizing
   * learning the prompt.
   * @default 0.01
   */
  prompt_loss_weight?: number | null;
  compute_classification_metrics?: boolean | null | undefined;
  classification_n_classes?: number | null;
  classification_positive_class?: string | null | undefined;
  /**
   * If this is provided, we calculate F-beta scores at the specified
   * beta values. The F-beta score is a generalization of F-1 score.
   * This is only used for binary classification.
   *
   * With a beta of 1 (i.e. the F-1 score), precision and recall are
   * given the same weight. A larger beta score puts more weight on
   * recall and less on precision. A smaller beta score puts more weight
   * on precision and less on recall.
   * @example 0.6,1,1.5,2
   */
  classification_betas?: number[];
  suffix?: string | null | undefined;
};
export type CreateEmbeddingRequest = {
  model: string;
  /**
   * Input text to get embeddings for, encoded as a string or array of tokens.
   * To get embeddings for multiple inputs in a single request, pass an array of
   * strings or array of token arrays. Each input must not exceed 8192 tokens in
   * length.
   * @example The quick brown fox jumped over the lazy dog
   */
  input: string | string[] | number[] | number[][] | null;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type CreateEmbeddingResponse = {
  object: string;
  model: string;
  data: Array<{
    index: number;
    object: string;
    embedding: number[];
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
};
export type CreateTranscriptionRequest = {
  file: string;
  model: string;
  prompt?: string | undefined;
  /**
   * The format of the transcript output, in one of these options: json, text,
   * srt, verbose_json, or vtt.
   * @default json
   */
  response_format?: string | undefined;
  temperature?: number;
  language?: string | undefined;
};
export type CreateTranscriptionResponse = {
  text: string;
};
export type CreateTranslationRequest = {
  file: string;
  model: string;
  prompt?: string | undefined;
  /**
   * The format of the transcript output, in one of these options: json, text,
   * srt, verbose_json, or vtt.
   * @default json
   */
  response_format?: string | undefined;
  temperature?: number;
};
export type CreateTranslationResponse = {
  text: string;
};
export type Engine = {
  id: string;
  object: string;
  created: number | null;
  ready: boolean;
};
export type Model = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};
export type OpenAiFile = {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status: string;
  status_details: {};
};
export type FineTuneEvent = {
  object: string;
  created_at: number;
  level: string;
  message: string;
};
export type ListEnginesResponse = {
  object: string;
  data: Engine[];
};
export type ListModelsResponse = {
  object: string;
  data: Model[];
};
export type CreateChatCompletionRequest = {
  model: string;
  messages: ChatCompletionRequestMessage[];
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8
   * will make the output more random, while lower values like 0.2 will make it
   * more focused and deterministic.
   *
   * We generally recommend altering this or `top_p` but not both.
   * @default 1
   * @example 1
   */
  temperature?: number | null;
  /**
   * An alternative to sampling with temperature, called nucleus sampling, where
   * the model considers the results of the tokens with top_p probability mass.
   * So 0.1 means only the tokens comprising the top 10% probability mass are
   * considered.
   *
   * We generally recommend altering this or `temperature` but not both.
   * @default 1
   * @example 1
   */
  top_p?: number | null;
  /**
   * How many chat completion choices to generate for each input message.
   * @default 1
   * @example 1
   */
  n?: number | null;
  stream?: boolean | null | undefined;
  stop?: string | null | undefined | string[] | null | undefined;
  /**
   * The maximum number of tokens allowed for the generated answer. By default,
   * the number of tokens the model can return will be (4096 - prompt tokens).
   * @default inf
   */
  max_tokens?: number;
  presence_penalty?: number | null;
  frequency_penalty?: number | null;
  logit_bias?: {} | undefined;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to
   * monitor and detect abuse. [Learn
   * more](/docs/guides/safety-best-practices/end-user-ids).
   * @example user-1234
   */
  user?: string | undefined;
};
export type ListFilesResponse = {
  object: string;
  data: OpenAiFile[];
};
export type ListFineTunesResponse = {
  object: string;
  data: unknown[];
};
export type ListFineTuneEventsResponse = {
  object: string;
  data: FineTuneEvent[];
};
export type FineTune = {
  id: string;
  object: string;
  created_at: number;
  updated_at: number;
  model: string;
  fine_tuned_model: string | null;
  organization_id: string;
  status: string;
  hyperparams: {};
  training_files: OpenAiFile[];
  validation_files: OpenAiFile[];
  result_files: OpenAiFile[];
  events: FineTuneEvent[];
};
export type ListFineTuneEventsCommandQuery = {
  stream: 'true' | 'false';
};
