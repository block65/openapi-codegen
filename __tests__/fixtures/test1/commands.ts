/**
 * This file was auto generated by @block65/openapi-codegen
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2024-10-13T02:06:29.480Z
 *
 */
/** eslint-disable max-classes */
import { Command } from '@block65/rest-client';
import type {
  GetOperationCommandInput,
  LongRunningOperation,
  ListBillingAccountsCommandInput,
  BillingAccountList,
  CreateBillingAccountCommandInput,
  CreateBillingAccountCommandBody,
  BillingAccount,
  GetBillingAccountCommandInput,
  UpdateBillingAccountCommandInput,
  UpdateBillingAccountCommandBody,
  GetBillingAccountPortalCommandInput,
  GetBillingAccountPortalCommandBody,
  BillingAccountPortal,
  LinkBillingAccountCommandInput,
  LinkBillingAccountCommandBody,
  ListPaymentMethodsCommandInput,
  PaymentMethods,
  CreatePaymentMethodCommandInput,
  PaymentMethodIntendedLro,
  GetPaymentMethodFromStripeCommandInput,
  PaymentMethod,
  GetPaymentMethodCommandInput,
  UpdatePaymentMethodCommandInput,
  UpdatePaymentMethodCommandBody,
  DeletePaymentMethodCommandInput,
  PaymentMethodDeletedLro,
  ListBillingSubscriptionsCommandInput,
  BillingSubscriptions,
  CreateBillingSubscriptionCommandInput,
  CreateBillingSubscriptionCommandBody,
  BillingSubscriptionLro,
  UpdateBillingSubscriptionCommandInput,
  UpdateBillingSubscriptionCommandBody,
  CancelSubscriptionCommandInput,
  UpdateBillingSubscriptionPromoCodeCommandInput,
  UpdateBillingSubscriptionPromoCodeCommandBody,
} from './types.js';

/**
 * GetOperationCommand
 *
 */
export class GetOperationCommand extends Command<
  GetOperationCommandInput,
  LongRunningOperation,
  never
> {
  public override method = 'get' as const;

  constructor(input: GetOperationCommandInput) {
    const { operationId } = input;
    super(`/operations/${operationId}`);
  }
}

/**
 * ListBillingAccountsCommand
 *
 */
export class ListBillingAccountsCommand extends Command<
  ListBillingAccountsCommandInput,
  BillingAccountList,
  never
> {
  public override method = 'get' as const;
}

/**
 * CreateBillingAccountCommand
 *
 */
export class CreateBillingAccountCommand extends Command<
  CreateBillingAccountCommandInput,
  BillingAccount,
  CreateBillingAccountCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateBillingAccountCommandInput) {
    const body = input;
    super(`/billing-accounts`, body);
  }
}

/**
 * GetBillingAccountCommand
 *
 */
export class GetBillingAccountCommand extends Command<
  GetBillingAccountCommandInput,
  BillingAccount,
  never
> {
  public override method = 'get' as const;

  constructor(input: GetBillingAccountCommandInput) {
    const { billingAccountId } = input;
    super(`/billing-accounts/${billingAccountId}`);
  }
}

/**
 * UpdateBillingAccountCommand
 *
 */
export class UpdateBillingAccountCommand extends Command<
  UpdateBillingAccountCommandInput,
  BillingAccount,
  UpdateBillingAccountCommandBody
> {
  public override method = 'put' as const;

  constructor(input: UpdateBillingAccountCommandInput) {
    const { billingAccountId, ...body } = input;
    super(`/billing-accounts/${billingAccountId}`, body);
  }
}

/**
 * GetBillingAccountPortalCommand
 *
 */
export class GetBillingAccountPortalCommand extends Command<
  GetBillingAccountPortalCommandInput,
  BillingAccountPortal,
  GetBillingAccountPortalCommandBody
> {
  public override method = 'post' as const;

  constructor(input: GetBillingAccountPortalCommandInput) {
    const { billingAccountId, ...body } = input;
    super(`/billing-accounts/${billingAccountId}/portal`, body);
  }
}

/**
 * LinkBillingAccountCommand
 *
 */
export class LinkBillingAccountCommand extends Command<
  LinkBillingAccountCommandInput,
  unknown,
  LinkBillingAccountCommandBody
> {
  public override method = 'post' as const;

  constructor(input: LinkBillingAccountCommandInput) {
    const { billingAccountId, ...body } = input;
    super(`/billing-accounts/${billingAccountId}/link`, body);
  }
}

/**
 * ListPaymentMethodsCommand
 *
 */
export class ListPaymentMethodsCommand extends Command<
  ListPaymentMethodsCommandInput,
  PaymentMethods,
  never
> {
  public override method = 'get' as const;

  constructor(input: ListPaymentMethodsCommandInput) {
    const { billingAccountId } = input;
    super(`/billing-accounts/${billingAccountId}/payment-methods`);
  }
}

/**
 * CreatePaymentMethodCommand
 *
 */
export class CreatePaymentMethodCommand extends Command<
  CreatePaymentMethodCommandInput,
  PaymentMethodIntendedLro,
  never
> {
  public override method = 'post' as const;

  constructor(input: CreatePaymentMethodCommandInput) {
    const { billingAccountId } = input;
    super(`/billing-accounts/${billingAccountId}/payment-methods`);
  }
}

/**
 * GetPaymentMethodFromStripeCommand
 *
 */
export class GetPaymentMethodFromStripeCommand extends Command<
  GetPaymentMethodFromStripeCommandInput,
  PaymentMethod,
  never
> {
  public override method = 'get' as const;

  constructor(input: GetPaymentMethodFromStripeCommandInput) {
    const { billingAccountId, stripePaymentMethodId } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/stripe/${stripePaymentMethodId}`,
    );
  }
}

/**
 * GetPaymentMethodCommand
 *
 */
export class GetPaymentMethodCommand extends Command<
  GetPaymentMethodCommandInput,
  PaymentMethod,
  never
> {
  public override method = 'get' as const;

  constructor(input: GetPaymentMethodCommandInput) {
    const { billingAccountId, paymentMethodId } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
    );
  }
}

/**
 * UpdatePaymentMethodCommand
 *
 */
export class UpdatePaymentMethodCommand extends Command<
  UpdatePaymentMethodCommandInput,
  undefined,
  UpdatePaymentMethodCommandBody
> {
  public override method = 'put' as const;

  constructor(input: UpdatePaymentMethodCommandInput) {
    const { billingAccountId, paymentMethodId, ...body } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
      body,
    );
  }
}

/**
 * DeletePaymentMethodCommand
 *
 */
export class DeletePaymentMethodCommand extends Command<
  DeletePaymentMethodCommandInput,
  PaymentMethodDeletedLro,
  never
> {
  public override method = 'delete' as const;

  constructor(input: DeletePaymentMethodCommandInput) {
    const { billingAccountId, paymentMethodId } = input;
    super(
      `/billing-accounts/${billingAccountId}/payment-methods/${paymentMethodId}`,
    );
  }
}

/**
 * ListBillingSubscriptionsCommand
 *
 */
export class ListBillingSubscriptionsCommand extends Command<
  ListBillingSubscriptionsCommandInput,
  BillingSubscriptions,
  never
> {
  public override method = 'get' as const;

  constructor(input: ListBillingSubscriptionsCommandInput) {
    const { billingAccountId } = input;
    super(`/billing-accounts/${billingAccountId}/subscriptions`);
  }
}

/**
 * CreateBillingSubscriptionCommand
 *
 */
export class CreateBillingSubscriptionCommand extends Command<
  CreateBillingSubscriptionCommandInput,
  BillingSubscriptionLro,
  CreateBillingSubscriptionCommandBody
> {
  public override method = 'post' as const;

  constructor(input: CreateBillingSubscriptionCommandInput) {
    const { billingAccountId, ...body } = input;
    super(`/billing-accounts/${billingAccountId}/subscriptions`, body);
  }
}

/**
 * UpdateBillingSubscriptionCommand
 *
 */
export class UpdateBillingSubscriptionCommand extends Command<
  UpdateBillingSubscriptionCommandInput,
  undefined,
  UpdateBillingSubscriptionCommandBody
> {
  public override method = 'put' as const;

  constructor(input: UpdateBillingSubscriptionCommandInput) {
    const { billingAccountId, subscriptionId, ...body } = input;
    super(
      `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}`,
      body,
    );
  }
}

/**
 * CancelSubscriptionCommand
 *
 */
export class CancelSubscriptionCommand extends Command<
  CancelSubscriptionCommandInput,
  undefined,
  never
> {
  public override method = 'delete' as const;

  constructor(input: CancelSubscriptionCommandInput) {
    const { billingAccountId, subscriptionId } = input;
    super(
      `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}`,
    );
  }
}

/**
 * UpdateBillingSubscriptionPromoCodeCommand
 *
 */
export class UpdateBillingSubscriptionPromoCodeCommand extends Command<
  UpdateBillingSubscriptionPromoCodeCommandInput,
  BillingSubscriptionLro,
  UpdateBillingSubscriptionPromoCodeCommandBody
> {
  public override method = 'put' as const;

  constructor(input: UpdateBillingSubscriptionPromoCodeCommandInput) {
    const { billingAccountId, subscriptionId, ...body } = input;
    super(
      `/billing-accounts/${billingAccountId}/subscriptions/${subscriptionId}/promo-code`,
      body,
    );
  }
}
