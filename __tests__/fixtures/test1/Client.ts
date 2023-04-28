import type { HttpMethod } from '@block65/rest-client';

type SpecialJsonValue = object;

export abstract class Command<
  CommandInput extends SpecialJsonValue,
  CommandOutput extends SpecialJsonValue,
> {
  public method: HttpMethod = 'get';

  public pathname: string;

  protected input: CommandInput;

  protected middlewareStack: CommandOutput[] = [];

  constructor(pathname: string, input: CommandInput) {
    this.pathname = pathname;
    this.input = input;
  }

  public serialize(): string {
    return JSON.stringify({
      method: this.method,
      pathname: this.pathname,
      input: this.input,
    });
  }
}

export class Client<
  HandlerOptions,
  ClientInput extends SpecialJsonValue,
  ClientOutput extends SpecialJsonValue,
> {
  config: any;
  constructor(config: any = {}) {
    this.config = config;
  }

  async send<InputType extends ClientInput, OutputType extends ClientOutput>(
    _command: Command<InputType, OutputType>,
    _options?: HandlerOptions,
  ): Promise<OutputType> {
    return null as unknown as OutputType;
  }
}
