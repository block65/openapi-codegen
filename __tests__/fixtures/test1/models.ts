/**
 * This file is auto generated.
 *
 * WARN: Do not edit directly.
 *
 * Generated on 2023-04-01T07:54:08.728Z
 *
 */
export type Uuid = string;
export type Id = string;
export type Origin = string;
export type Url = string;
/** Reasonable string to be used as a name of a person, or an object */
export type Name = string;
export type DateTime = Date;
/** Valid email address with fully qualified public top-level domain */
export type Email = string;
export type StringU8 = string;
export type PromoCode = string;

export enum BillingAccountStatus {
  Nominal = 'nominal',
  Delinquent = 'delinquent',
}

export enum BillingAccountType {
  Standard = 'standard',
  Agency = 'agency',
  Reseller = 'reseller',
}

export enum BillingLocale {
  En = 'en',
}

export enum BillingCountry {
  Us = 'us',
  Au = 'au',
  Sg = 'sg',
  My = 'my',
  Gb = 'gb',
}

export enum Currency {
  Usd = 'usd',
  Aud = 'aud',
  Sgd = 'sgd',
  Myr = 'myr',
  Gbp = 'gbp',
}

export type TimeZone = string;
export type LinkBillingAccount = {
  __ignoreThisModel?: string | undefined;
};
export type StripeId = string;

export enum PaymentMethodBrand {
  Amex = 'amex',
  Diners = 'diners',
  Discover = 'discover',
  Jcb = 'jcb',
  Mastercard = 'mastercard',
  Unionpay = 'unionpay',
  Visa = 'visa',
  Unknown = 'unknown',
}

export enum PlanSku {
  Donotuse = 'donotuse',
  Plasku1 = 'plasku1',
  Plasku2 = 'plasku2',
  Plasku3 = 'plasku3',
  Plasku4 = 'plasku4',
}

export enum BillingSubscriptionStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum BillingSubscriptionInterval {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export type LongRunningOperationIndeterminate = {
  operationId: Uuid;
  done: boolean;
};
export type LongRunningOperationFail = {
  operationId: Uuid;
  done: boolean;
  result: {
    error: number;
  };
};
export type LongRunningOperationSuccess = {
  operationId: Uuid;
  done: boolean;
  result: {
    response: {};
  };
};
export type LongRunningOperation =
  | LongRunningOperationIndeterminate
  | LongRunningOperationFail
  | LongRunningOperationSuccess;
export type BillingAccountIdentifiers = {
  billingAccountId: Id;
};
export type BillingAccount = BillingAccountIdentifiers & {
  name: Name;
  email: Email;
  country: BillingCountry;
  status: BillingAccountStatus;
  currency: Currency;
  type: BillingAccountType;
  createdTime: DateTime;
  updatedTime?: DateTime | undefined;
  locale?: BillingLocale | undefined;
  purchaseOrder?: StringU8 | undefined;
  taxId?: StringU8 | undefined;
  timeZone?: TimeZone | undefined;
  defaultPaymentMethodId?: Id | undefined;
};
export type BillingAccountCreateRequest = {
  name: Name;
  email: Email;
  country: BillingCountry;
  timeZone: TimeZone;
  currency: Currency;
  locale?: BillingLocale | undefined | null | undefined;
  purchaseOrder?: StringU8 | undefined | null | undefined;
  taxId?: StringU8 | undefined | null | undefined;
};
export type BillingAccountUpdateRequest = {
  name?: Name | undefined;
  email?: Email | undefined;
  country?: BillingCountry | undefined;
  timeZone?: TimeZone | undefined;
  currency?: Currency | undefined;
  locale?: BillingLocale | undefined | null | undefined;
  purchaseOrder?: StringU8 | undefined | null | undefined;
  taxId?: StringU8 | undefined | null | undefined;
};
export type BillingAccountList = BillingAccount[];
export type BillingAccountPortalRequest = {
  origin: Origin;
  accountId: Id;
};
export type BillingAccountPortal = {
  url: Url;
};
export type LinkBillingAccountRequest = {
  accountId: Id;
};
export type PaymentMethodIdentifiers = {
  billingAccountId: Id;
  paymentMethodId: Id;
};
export type PaymentMethod = PaymentMethodIdentifiers & {
  label: Name;
  expireTime: DateTime;
  humanId: StringU8;
  brand?: PaymentMethodBrand | undefined;
};
export type UpdatePaymentMethodRequest = {
  label?: Name | undefined;
  isDefault?: boolean | undefined;
};
export type PaymentMethodLongRunningOperationSuccess = {
  operationId: Uuid;
  done: boolean;
  result: {
    response: {
      clientSecret: string;
    };
  };
};
export type PaymentMethodDeletedLongRunningOperationSuccess = {
  operationId: Uuid;
  done: boolean;
  result: {
    response: {
      ok: boolean;
    };
  };
};
export type PaymentMethodIntendedLro =
  | LongRunningOperationIndeterminate
  | PaymentMethodLongRunningOperationSuccess
  | LongRunningOperationFail;
export type PaymentMethodDeletedLro =
  | LongRunningOperationIndeterminate
  | PaymentMethodDeletedLongRunningOperationSuccess
  | LongRunningOperationFail;
export type PaymentMethods = PaymentMethod[];
export type BillingSubscriptionIdentifiers = {
  billingAccountId: Id;
  subscriptionId: Id;
};
export type BillingSubscription = BillingSubscriptionIdentifiers & {
  accountId?: Id | undefined;
  planSku: PlanSku;
  interval: BillingSubscriptionInterval;
  status: BillingSubscriptionStatus;
  cycleTime: DateTime;
  trialEndTime?: DateTime | undefined;
  createdTime: DateTime;
  updatedTime?: DateTime | undefined;
};
export type CreateBillingSubscriptionRequest = {
  accountId: Id;
  planSku: PlanSku;
  interval: BillingSubscriptionInterval;
  promoCode?: StringU8 | undefined;
};
export type UpdateBillingSubscriptionRequest = {
  label?: Name | undefined;
  trialEndTime?: DateTime | undefined;
};
export type UpdateBillingSubscriptionPromoCodeRequest = {
  promoCode: StringU8 | null;
};
export type BillingSubscriptionPromoCodeLongRunningOperationSuccess = {
  operationId: Uuid;
  done: boolean;
  result: {
    response: {
      promoCode: StringU8;
    };
  };
};
export type BillingSubscriptionLro =
  | LongRunningOperationIndeterminate
  | BillingSubscriptionPromoCodeLongRunningOperationSuccess
  | LongRunningOperationFail;
export type BillingSubscriptions = BillingSubscription[];
