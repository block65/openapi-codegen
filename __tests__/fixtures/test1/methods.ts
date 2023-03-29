import type { RequestMethodCaller } from '@block65/rest-client';
import type { Simplify } from 'type-fest';
import type {
  LongRunningOperation,
  BillingAccountList,
  BillingAccountCreateRequest,
  BillingAccount,
  BillingAccountUpdateRequest,
  BillingAccountPortalRequest,
  BillingAccountPortal,
  LinkBillingAccountRequest,
  LinkBillingAccount,
  PaymentMethods,
  PaymentMethodIntendedLro,
  PaymentMethod,
  UpdatePaymentMethodRequest,
  PaymentMethodDeletedLro,
  BillingSubscriptions,
  CreateBillingSubscriptionRequest,
  BillingSubscriptionLro,
  UpdateBillingSubscriptionRequest,
  UpdateBillingSubscriptionPromoCodeRequest,
} from './models.js';

/**
 * getOperationCommand
 * @param operationId {String}
 * @returns {RequestMethodCaller<LongRunningOperation>} HTTP 200
 */
export function getOperationCommand(
  operationId: string,
): RequestMethodCaller<LongRunningOperation> {
  const req = {
    method: 'get' as const,
    pathname: `/operations/${operationId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listBillingAccountsCommand
 * @returns {RequestMethodCaller<BillingAccountList>} HTTP 200
 */
export function listBillingAccountsCommand(): RequestMethodCaller<BillingAccountList> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createBillingAccountCommand
 * @param parameters.body {BillingAccountCreateRequest}
 * @returns {RequestMethodCaller<BillingAccount>} HTTP 200
 */
export function createBillingAccountCommand(parameters: {
  body: Simplify<BillingAccountCreateRequest>;
}): RequestMethodCaller<BillingAccount> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getBillingAccountCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<BillingAccount>} HTTP 200
 */
export function getBillingAccountCommand(
  billingAccountId: string,
): RequestMethodCaller<BillingAccount> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * updateBillingAccountCommand
 * @param billingAccountId {String}
 * @param parameters.body {BillingAccountUpdateRequest}
 * @returns {RequestMethodCaller<BillingAccount>} HTTP 200
 */
export function updateBillingAccountCommand(
  billingAccountId: string,
  parameters: {
    body: Simplify<BillingAccountUpdateRequest>;
  },
): RequestMethodCaller<BillingAccount> {
  const req = {
    method: 'put' as const,
    pathname: `/billing-accounts/${billingAccountId}`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getBillingAccountPortalCommand
 * @param billingAccountId {String}
 * @param parameters.body {BillingAccountPortalRequest}
 * @returns {RequestMethodCaller<BillingAccountPortal>} HTTP 200
 */
export function getBillingAccountPortalCommand(
  billingAccountId: string,
  parameters: {
    body: Simplify<BillingAccountPortalRequest>;
  },
): RequestMethodCaller<BillingAccountPortal> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/portal`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * linkBillingAccountCommand
 * @param billingAccountId {String}
 * @param parameters.body {LinkBillingAccountRequest}
 * @returns {RequestMethodCaller<LinkBillingAccount>} HTTP 200
 */
export function linkBillingAccountCommand(
  billingAccountId: string,
  parameters: {
    body: Simplify<LinkBillingAccountRequest>;
  },
): RequestMethodCaller<LinkBillingAccount> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/link`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listPaymentMethodsCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<PaymentMethods>} HTTP 200
 */
export function listPaymentMethodsCommand(
  billingAccountId: string,
): RequestMethodCaller<PaymentMethods> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createPaymentMethodCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<PaymentMethodIntendedLro>} HTTP 200
 */
export function createPaymentMethodCommand(
  billingAccountId: string,
): RequestMethodCaller<PaymentMethodIntendedLro> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getPaymentMethodFromStripeCommand
 * @param billingAccountId {String}
 * @param stripePaymentMethodId {String}
 * @returns {RequestMethodCaller<PaymentMethod>} HTTP 200
 */
export function getPaymentMethodFromStripeCommand(
  billingAccountId: string,
  stripePaymentMethodId: string,
): RequestMethodCaller<PaymentMethod> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/stripe/${stripePaymentMethodId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * getPaymentMethodCommand
 * @param billingAccountId {String}
 * @param paymentMethodId {String}
 * @returns {RequestMethodCaller<PaymentMethod>} HTTP 200
 */
export function getPaymentMethodCommand(
  billingAccountId: string,
  paymentMethodId: string,
): RequestMethodCaller<PaymentMethod> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
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
    body: Simplify<UpdatePaymentMethodRequest>;
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
 * deletePaymentMethodCommand
 * @param billingAccountId {String}
 * @param paymentMethodId {String}
 * @returns {RequestMethodCaller<PaymentMethodDeletedLro>} HTTP 200
 */
export function deletePaymentMethodCommand(
  billingAccountId: string,
  paymentMethodId: string,
): RequestMethodCaller<PaymentMethodDeletedLro> {
  const req = {
    method: 'delete' as const,
    pathname: `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * listBillingSubscriptionsCommand
 * @param billingAccountId {String}
 * @returns {RequestMethodCaller<BillingSubscriptions>} HTTP 200
 */
export function listBillingSubscriptionsCommand(
  billingAccountId: string,
): RequestMethodCaller<BillingSubscriptions> {
  const req = {
    method: 'get' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions`,
  };
  return (requestMethod, options) => requestMethod(req, options);
}

/**
 * createBillingSubscriptionCommand
 * @param billingAccountId {String}
 * @param parameters.body {CreateBillingSubscriptionRequest}
 * @returns {RequestMethodCaller<BillingSubscriptionLro>} HTTP 200
 */
export function createBillingSubscriptionCommand(
  billingAccountId: string,
  parameters: {
    body: Simplify<CreateBillingSubscriptionRequest>;
  },
): RequestMethodCaller<BillingSubscriptionLro> {
  const req = {
    method: 'post' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
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
    body: Simplify<UpdateBillingSubscriptionRequest>;
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
 * updateBillingSubscriptionPromoCodeCommand
 * @param billingAccountId {String}
 * @param subscriptionId {String}
 * @param parameters.body {UpdateBillingSubscriptionPromoCodeRequest}
 * @returns {RequestMethodCaller<BillingSubscriptionLro>} HTTP 200
 */
export function updateBillingSubscriptionPromoCodeCommand(
  billingAccountId: string,
  subscriptionId: string,
  parameters: {
    body: Simplify<UpdateBillingSubscriptionPromoCodeRequest>;
  },
): RequestMethodCaller<BillingSubscriptionLro> {
  const req = {
    method: 'put' as const,
    pathname: `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}/promo-code`,
    body: parameters.body,
  };
  return (requestMethod, options) => requestMethod(req, options);
}
