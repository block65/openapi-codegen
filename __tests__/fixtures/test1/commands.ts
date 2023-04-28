import { Command } from '@block65/rest-client';
import type { RequestMethodCaller } from '@block65/rest-client';
import type {
  GetOperationCommandInput,
  GetOperationCommandBody,
  LongRunningOperation as LongRunningOperationOutput,
  ListBillingAccountsCommandInput,
  ListBillingAccountsCommandBody,
  BillingAccountList as BillingAccountListOutput,
  BillingAccountCreateRequest,
  CreateBillingAccountCommandInput,
  CreateBillingAccountCommandBody,
  BillingAccount as BillingAccountOutput,
  GetBillingAccountCommandInput,
  GetBillingAccountCommandBody,
  BillingAccountUpdateRequest,
  UpdateBillingAccountCommandInput,
  UpdateBillingAccountCommandBody,
  BillingAccountPortalRequest,
  GetBillingAccountPortalCommandInput,
  GetBillingAccountPortalCommandBody,
  BillingAccountPortal as BillingAccountPortalOutput,
  LinkBillingAccountRequest,
  LinkBillingAccountCommandInput,
  LinkBillingAccountCommandBody,
  ListPaymentMethodsCommandInput,
  ListPaymentMethodsCommandBody,
  PaymentMethods as PaymentMethodsOutput,
  CreatePaymentMethodCommandInput,
  CreatePaymentMethodCommandBody,
  PaymentMethodIntendedLro as PaymentMethodIntendedLroOutput,
  GetPaymentMethodFromStripeCommandInput,
  GetPaymentMethodFromStripeCommandBody,
  PaymentMethod as PaymentMethodOutput,
  GetPaymentMethodCommandInput,
  GetPaymentMethodCommandBody,
  UpdatePaymentMethodRequest,
  UpdatePaymentMethodCommandInput,
  UpdatePaymentMethodCommandBody,
  DeletePaymentMethodCommandInput,
  DeletePaymentMethodCommandBody,
  PaymentMethodDeletedLro as PaymentMethodDeletedLroOutput,
  ListBillingSubscriptionsCommandInput,
  ListBillingSubscriptionsCommandBody,
  BillingSubscriptions as BillingSubscriptionsOutput,
  CreateBillingSubscriptionRequest,
  CreateBillingSubscriptionCommandInput,
  CreateBillingSubscriptionCommandBody,
  BillingSubscriptionLro as BillingSubscriptionLroOutput,
  UpdateBillingSubscriptionRequest,
  UpdateBillingSubscriptionCommandInput,
  UpdateBillingSubscriptionCommandBody,
  CancelSubscriptionCommandInput,
  CancelSubscriptionCommandBody,
  UpdateBillingSubscriptionPromoCodeRequest,
  UpdateBillingSubscriptionPromoCodeCommandInput,
  UpdateBillingSubscriptionPromoCodeCommandBody,
} from './types.js';

/**
 * getOperationCommand
 * @param operationId {String}
 * @returns {RequestMethodCaller<LongRunningOperationOutput>} HTTP 200
 */
export function getOperationCommand(
  operationId: string,
): RequestMethodCaller<LongRunningOperationOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/operations/${operationId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getOperationCommand
 *
 *
 */
export class GetOperationCommand extends Command<
  GetOperationCommandInput,
  LongRunningOperationOutput,
  GetOperationCommandBody
> {
  override method = 'get' as const;

  constructor(input: GetOperationCommandInput) {
    const { operationId, ...rest } = input;
    super(`/operations/${operationId}`, rest);
  }
}

/**
 * listBillingAccountsCommand
 * @returns {RequestMethodCaller<BillingAccountListOutput>} HTTP 200
 */
export function listBillingAccountsCommand(): RequestMethodCaller<BillingAccountListOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listBillingAccountsCommand
 *
 *
 */
export class ListBillingAccountsCommand extends Command<
  ListBillingAccountsCommandInput,
  BillingAccountListOutput,
  ListBillingAccountsCommandBody
> {
  override method = 'get' as const;

  constructor(input: ListBillingAccountsCommandInput) {
    const { ...rest } = input;
    super(`/billing-accounts`, rest);
  }
}

/**
 * createBillingAccountCommand
 * @param parameters.body {BillingAccountCreateRequest}
 * @returns {RequestMethodCaller<BillingAccountOutput>} HTTP 200
 */
export function createBillingAccountCommand(parameters: {
  body: BillingAccountCreateRequest;
}): RequestMethodCaller<BillingAccountOutput> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createBillingAccountCommand
 *
 *
 */
export class CreateBillingAccountCommand extends Command<
  CreateBillingAccountCommandInput,
  BillingAccountOutput,
  CreateBillingAccountCommandBody
> {
  override method = 'post' as const;

  constructor(input: CreateBillingAccountCommandInput) {
    const { parameters, ...rest } = input;
    super(`/billing-accounts`, rest);
  }
}

/**
 * getBillingAccountCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<BillingAccountOutput>} HTTP 200
 */
export function getBillingAccountCommand(
  billingAccountId: string,
): RequestMethodCaller<BillingAccountOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getBillingAccountCommand
 *
 *
 */
export class GetBillingAccountCommand extends Command<
  GetBillingAccountCommandInput,
  BillingAccountOutput,
  GetBillingAccountCommandBody
> {
  override method = 'get' as const;

  constructor(input: GetBillingAccountCommandInput) {
    const { billingAccountId, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}`, rest);
  }
}

/**
 * updateBillingAccountCommand
 * @param billingAccountId {String}
 * @param parameters.body {BillingAccountUpdateRequest}
 * @returns {RequestMethodCaller<BillingAccountOutput>} HTTP 200
 */
export function updateBillingAccountCommand(
  billingAccountId: string,
  parameters: {
    body: BillingAccountUpdateRequest;
  },
): RequestMethodCaller<BillingAccountOutput> {
  const req = {
    method: 'put' as const,
    pathname: `/billing-accounts/${billingAccountId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * updateBillingAccountCommand
 *
 *
 */
export class UpdateBillingAccountCommand extends Command<
  UpdateBillingAccountCommandInput,
  BillingAccountOutput,
  UpdateBillingAccountCommandBody
> {
  override method = 'put' as const;

  constructor(input: UpdateBillingAccountCommandInput) {
    const { billingAccountId, parameters, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}`, rest);
  }
}

/**
 * getBillingAccountPortalCommand
 * @param billingAccountId {String}
 * @param parameters.body {BillingAccountPortalRequest}
 * @returns {RequestMethodCaller<BillingAccountPortalOutput>} HTTP 200
 */
export function getBillingAccountPortalCommand(
  billingAccountId: string,
  parameters: {
    body: BillingAccountPortalRequest;
  },
): RequestMethodCaller<BillingAccountPortalOutput> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/portal`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getBillingAccountPortalCommand
 *
 *
 */
export class GetBillingAccountPortalCommand extends Command<
  GetBillingAccountPortalCommandInput,
  BillingAccountPortalOutput,
  GetBillingAccountPortalCommandBody
> {
  override method = 'post' as const;

  constructor(input: GetBillingAccountPortalCommandInput) {
    const { billingAccountId, parameters, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}/portal`, rest);
  }
}

/**
 * linkBillingAccountCommand
 * @param billingAccountId {String}
 * @param parameters.body {LinkBillingAccountRequest}
 */
export function linkBillingAccountCommand(
  billingAccountId: string,
  parameters: {
    body: LinkBillingAccountRequest;
  },
): RequestMethodCaller<void> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/link`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * linkBillingAccountCommand
 *
 *
 */
export class LinkBillingAccountCommand extends Command<
  LinkBillingAccountCommandInput,
  void
> {
  override method = 'post' as const;

  constructor(input: LinkBillingAccountCommandInput) {
    const { billingAccountId, parameters, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}/link`, rest);
  }
}

/**
 * listPaymentMethodsCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<PaymentMethodsOutput>} HTTP 200
 */
export function listPaymentMethodsCommand(
  billingAccountId: string,
): RequestMethodCaller<PaymentMethodsOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listPaymentMethodsCommand
 *
 *
 */
export class ListPaymentMethodsCommand extends Command<
  ListPaymentMethodsCommandInput,
  PaymentMethodsOutput,
  ListPaymentMethodsCommandBody
> {
  override method = 'get' as const;

  constructor(input: ListPaymentMethodsCommandInput) {
    const { billingAccountId, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}/payment-methods`, rest);
  }
}

/**
 * createPaymentMethodCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<PaymentMethodIntendedLroOutput>} HTTP 200
 */
export function createPaymentMethodCommand(
  billingAccountId: string,
): RequestMethodCaller<PaymentMethodIntendedLroOutput> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createPaymentMethodCommand
 *
 *
 */
export class CreatePaymentMethodCommand extends Command<
  CreatePaymentMethodCommandInput,
  PaymentMethodIntendedLroOutput,
  CreatePaymentMethodCommandBody
> {
  override method = 'post' as const;

  constructor(input: CreatePaymentMethodCommandInput) {
    const { billingAccountId, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}/payment-methods`, rest);
  }
}

/**
 * getPaymentMethodFromStripeCommand
 * @param billingAccountId {String}
 * @param stripePaymentMethodId {String}
 * @returns {RequestMethodCaller<PaymentMethodOutput>} HTTP 200
 */
export function getPaymentMethodFromStripeCommand(
  billingAccountId: string,
  stripePaymentMethodId: string,
): RequestMethodCaller<PaymentMethodOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/stripe/${stripePaymentMethodId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getPaymentMethodFromStripeCommand
 *
 *
 */
export class GetPaymentMethodFromStripeCommand extends Command<
  GetPaymentMethodFromStripeCommandInput,
  PaymentMethodOutput,
  GetPaymentMethodFromStripeCommandBody
> {
  override method = 'get' as const;

  constructor(input: GetPaymentMethodFromStripeCommandInput) {
    const { billingAccountId, stripePaymentMethodId, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/stripe/${stripePaymentMethodId}`,
      rest,
    );
  }
}

/**
 * getPaymentMethodCommand
 * @param billingAccountId {String}
 * @param paymentMethodId {String}
 * @returns {RequestMethodCaller<PaymentMethodOutput>} HTTP 200
 */
export function getPaymentMethodCommand(
  billingAccountId: string,
  paymentMethodId: string,
): RequestMethodCaller<PaymentMethodOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getPaymentMethodCommand
 *
 *
 */
export class GetPaymentMethodCommand extends Command<
  GetPaymentMethodCommandInput,
  PaymentMethodOutput,
  GetPaymentMethodCommandBody
> {
  override method = 'get' as const;

  constructor(input: GetPaymentMethodCommandInput) {
    const { billingAccountId, paymentMethodId, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
      rest,
    );
  }
}

/**
 * updatePaymentMethodCommand
 * @param billingAccountId {String}
 * @param paymentMethodId {String}
 * @param parameters.body {UpdatePaymentMethodRequest}
 */
export function updatePaymentMethodCommand(
  billingAccountId: string,
  paymentMethodId: string,
  parameters: {
    body: UpdatePaymentMethodRequest;
  },
): RequestMethodCaller<void> {
  const req = {
    method: 'put' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * updatePaymentMethodCommand
 *
 *
 */
export class UpdatePaymentMethodCommand extends Command<
  UpdatePaymentMethodCommandInput,
  void
> {
  override method = 'put' as const;

  constructor(input: UpdatePaymentMethodCommandInput) {
    const { billingAccountId, paymentMethodId, parameters, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
      rest,
    );
  }
}

/**
 * deletePaymentMethodCommand
 * @param billingAccountId {String}
 * @param paymentMethodId {String}
 * @returns {RequestMethodCaller<PaymentMethodDeletedLroOutput>} HTTP 200
 */
export function deletePaymentMethodCommand(
  billingAccountId: string,
  paymentMethodId: string,
): RequestMethodCaller<PaymentMethodDeletedLroOutput> {
  const req = {
    method: 'delete' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * deletePaymentMethodCommand
 *
 *
 */
export class DeletePaymentMethodCommand extends Command<
  DeletePaymentMethodCommandInput,
  PaymentMethodDeletedLroOutput,
  DeletePaymentMethodCommandBody
> {
  override method = 'delete' as const;

  constructor(input: DeletePaymentMethodCommandInput) {
    const { billingAccountId, paymentMethodId, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
      rest,
    );
  }
}

/**
 * listBillingSubscriptionsCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<BillingSubscriptionsOutput>} HTTP 200
 */
export function listBillingSubscriptionsCommand(
  billingAccountId: string,
): RequestMethodCaller<BillingSubscriptionsOutput> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listBillingSubscriptionsCommand
 *
 *
 */
export class ListBillingSubscriptionsCommand extends Command<
  ListBillingSubscriptionsCommandInput,
  BillingSubscriptionsOutput,
  ListBillingSubscriptionsCommandBody
> {
  override method = 'get' as const;

  constructor(input: ListBillingSubscriptionsCommandInput) {
    const { billingAccountId, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}/subscriptions`, rest);
  }
}

/**
 * createBillingSubscriptionCommand
 * @param billingAccountId {String}
 * @param parameters.body {CreateBillingSubscriptionRequest}
 * @returns {RequestMethodCaller<BillingSubscriptionLroOutput>} HTTP 200
 */
export function createBillingSubscriptionCommand(
  billingAccountId: string,
  parameters: {
    body: CreateBillingSubscriptionRequest;
  },
): RequestMethodCaller<BillingSubscriptionLroOutput> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createBillingSubscriptionCommand
 *
 *
 */
export class CreateBillingSubscriptionCommand extends Command<
  CreateBillingSubscriptionCommandInput,
  BillingSubscriptionLroOutput,
  CreateBillingSubscriptionCommandBody
> {
  override method = 'post' as const;

  constructor(input: CreateBillingSubscriptionCommandInput) {
    const { billingAccountId, parameters, ...rest } = input;
    super(`/billing-accounts/${billingAccountId}/subscriptions`, rest);
  }
}

/**
 * updateBillingSubscriptionCommand
 * @param billingAccountId {String}
 * @param subscriptionId {String}
 * @param parameters.body {UpdateBillingSubscriptionRequest}
 */
export function updateBillingSubscriptionCommand(
  billingAccountId: string,
  subscriptionId: string,
  parameters: {
    body: UpdateBillingSubscriptionRequest;
  },
): RequestMethodCaller<void> {
  const req = {
    method: 'put' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * updateBillingSubscriptionCommand
 *
 *
 */
export class UpdateBillingSubscriptionCommand extends Command<
  UpdateBillingSubscriptionCommandInput,
  void
> {
  override method = 'put' as const;

  constructor(input: UpdateBillingSubscriptionCommandInput) {
    const { billingAccountId, subscriptionId, parameters, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}`,
      rest,
    );
  }
}

/**
 * cancelSubscriptionCommand
 * @param billingAccountId {String}
 * @param subscriptionId {String}
 */
export function cancelSubscriptionCommand(
  billingAccountId: string,
  subscriptionId: string,
): RequestMethodCaller<void> {
  const req = {
    method: 'delete' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * cancelSubscriptionCommand
 *
 *
 */
export class CancelSubscriptionCommand extends Command<
  CancelSubscriptionCommandInput,
  void
> {
  override method = 'delete' as const;

  constructor(input: CancelSubscriptionCommandInput) {
    const { billingAccountId, subscriptionId, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}`,
      rest,
    );
  }
}

/**
 * updateBillingSubscriptionPromoCodeCommand
 * @param billingAccountId {String}
 * @param subscriptionId {String}
 * @param parameters.body {UpdateBillingSubscriptionPromoCodeRequest}
 * @returns {RequestMethodCaller<BillingSubscriptionLroOutput>} HTTP 200
 */
export function updateBillingSubscriptionPromoCodeCommand(
  billingAccountId: string,
  subscriptionId: string,
  parameters: {
    body: UpdateBillingSubscriptionPromoCodeRequest;
  },
): RequestMethodCaller<BillingSubscriptionLroOutput> {
  const req = {
    method: 'put' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}/promo-code`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * updateBillingSubscriptionPromoCodeCommand
 *
 *
 */
export class UpdateBillingSubscriptionPromoCodeCommand extends Command<
  UpdateBillingSubscriptionPromoCodeCommandInput,
  BillingSubscriptionLroOutput,
  UpdateBillingSubscriptionPromoCodeCommandBody
> {
  override method = 'put' as const;

  constructor(input: UpdateBillingSubscriptionPromoCodeCommandInput) {
    const { billingAccountId, subscriptionId, parameters, ...rest } = input;
    super(
      `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}/promo-code`,
      rest,
    );
  }
}

export class OpenAiClient extends RestServiceClient<AllInputs, void> {
  constructor() {
    const;
    super();
  }
}
