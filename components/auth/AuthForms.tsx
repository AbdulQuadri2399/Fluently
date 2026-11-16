"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnline } from "@/hooks/useOnline";
import type { ActionResult } from "@/lib/actions/result";
import {
  resendSchema,
  resetRequestSchema,
  resetUpdateSchema,
  signInSchema,
  signUpSchema,
  type ResendInput,
  type ResetRequestInput,
  type ResetUpdateInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/schemas/auth";
import { authCopy as c } from "./copy";

type Action<I, O = void> = (input: I) => Promise<ActionResult<O>>;

/** SCR1 states from 03 §3. */
type Status =
  | "default"
  | "loading"
  | "wrongCredentials"
  | "notAllowed"
  | "checkEmail"
  | "resetSent"
  | "linkExpired"
  | "saveFailed";

const alertCopy: Partial<Record<Status, string>> = {
  wrongCredentials: c.wrongCredentials,
  notAllowed: c.notAllowed,
  linkExpired: c.linkExpired,
  saveFailed: c.saveFailed,
};

const successCopy: Partial<Record<Status, string>> = {
  checkEmail: c.checkEmail,
  resetSent: c.resetSent,
};

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] rounded-lg border border-border bg-surface p-8">
        <p className="mb-6 text-section font-semibold tracking-tight">Fluently</p>
        <h1 className="mb-6 text-page font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function StatusMessage({ status, online }: { status: Status; online: boolean }) {
  if (!online) {
    return (
      <p
        role="status"
        className="mb-4 rounded-sm border border-warning p-3 text-small text-warning"
      >
        {c.offline}
      </p>
    );
  }
  const alert = alertCopy[status];
  if (alert) {
    return (
      <p role="alert" className="mb-4 rounded-sm border border-danger p-3 text-small text-danger">
        {alert}
      </p>
    );
  }
  return null;
}

function Field<T extends FieldValues>({
  form,
  name,
  label,
  type,
  autoComplete,
  disabled,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  type: string;
  autoComplete: string;
  disabled: boolean;
}) {
  const error = form.formState.errors[name]?.message;
  const id = `field-${name}`;
  return (
    <div className="mb-4 grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...form.register(name)}
      />
      {typeof error === "string" ? (
        <p id={`${id}-error`} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Runs an action with the shared loading/offline handling and maps result codes to states. */
function useSubmit<I, O>(
  action: Action<I, O>,
  onOk: Status,
  codeMap: Partial<Record<string, Status>>,
  onSuccess?: (data: O) => void,
) {
  const online = useOnline();
  const [status, setStatus] = useState<Status>("default");
  async function submit(input: I) {
    if (!online) return;
    setStatus("loading");
    try {
      const res = await action(input);
      if (res.ok) {
        setStatus(onOk);
        onSuccess?.(res.data);
      } else setStatus(codeMap[res.code] ?? "saveFailed");
    } catch {
      setStatus("saveFailed");
    }
  }
  return { online, status, submit, loading: status === "loading" };
}

export function SignInForm({
  action,
  next,
}: {
  action: Action<SignInInput, { next: string }>;
  next?: string;
}) {
  const router = useRouter();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", next },
  });
  const { online, status, submit, loading } = useSubmit(
    action,
    "loading",
    { validation: "wrongCredentials", unconfirmed: "checkEmail" },
    (data) => {
      router.replace(data.next);
      router.refresh();
    },
  );
  const success = successCopy[status];
  return (
    <AuthCard title={c.signInTitle}>
      <StatusMessage status={status} online={online} />
      {success ? <p className="mb-4 text-small">{success}</p> : null}
      <form noValidate onSubmit={form.handleSubmit(submit)}>
        <Field
          form={form}
          name="email"
          label={c.emailLabel}
          type="email"
          autoComplete="email"
          disabled={loading}
        />
        <Field
          form={form}
          name="password"
          label={c.passwordLabel}
          type="password"
          autoComplete="current-password"
          disabled={loading}
        />
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          loadingLabel={c.signingIn}
          disabledReason={online ? undefined : c.offline}
        >
          {c.signIn}
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-small">
        <Link className="text-primary underline-offset-4 hover:underline" href="/sign-up">
          {c.createAccount}
        </Link>
        <Link className="text-primary underline-offset-4 hover:underline" href="/reset">
          {c.forgotPassword}
        </Link>
      </div>
    </AuthCard>
  );
}

export function SignUpForm({ action }: { action: Action<SignUpInput> }) {
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });
  const { online, status, submit, loading } = useSubmit(action, "checkEmail", {
    forbidden: "notAllowed",
  });
  return (
    <AuthCard title={c.signUpTitle}>
      <StatusMessage status={status} online={online} />
      {status === "checkEmail" ? (
        <p className="text-body">{c.checkEmail}</p>
      ) : (
        <form noValidate onSubmit={form.handleSubmit(submit)}>
          <Field
            form={form}
            name="email"
            label={c.emailLabel}
            type="email"
            autoComplete="email"
            disabled={loading}
          />
          <Field
            form={form}
            name="password"
            label={c.passwordLabel}
            type="password"
            autoComplete="new-password"
            disabled={loading}
          />
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel={c.creatingAccount}
            disabledReason={online ? undefined : c.offline}
          >
            {c.createAccount}
          </Button>
        </form>
      )}
      <p className="mt-6 text-small">
        <Link className="text-primary underline-offset-4 hover:underline" href="/sign-in">
          {c.haveAccount}
        </Link>
      </p>
    </AuthCard>
  );
}

export function ResetRequestForm({ action }: { action: Action<ResetRequestInput> }) {
  const form = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: "" },
  });
  const { online, status, submit, loading } = useSubmit(action, "resetSent", {});
  return (
    <AuthCard title={c.resetTitle}>
      <StatusMessage status={status} online={online} />
      {status === "resetSent" ? (
        <p className="text-body">{c.resetSent}</p>
      ) : (
        <form noValidate onSubmit={form.handleSubmit(submit)}>
          <Field
            form={form}
            name="email"
            label={c.emailLabel}
            type="email"
            autoComplete="email"
            disabled={loading}
          />
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel={c.sending}
            disabledReason={online ? undefined : c.offline}
          >
            {c.sendResetLink}
          </Button>
        </form>
      )}
      <p className="mt-6 text-small">
        <Link className="text-primary underline-offset-4 hover:underline" href="/sign-in">
          {c.backToSignIn}
        </Link>
      </p>
    </AuthCard>
  );
}

export function ResetUpdateForm({
  action,
}: {
  action: Action<ResetUpdateInput, { next: string }>;
}) {
  const router = useRouter();
  const form = useForm<ResetUpdateInput>({
    resolver: zodResolver(resetUpdateSchema),
    defaultValues: { password: "" },
  });
  const { online, status, submit, loading } = useSubmit(
    action,
    "loading",
    { forbidden: "linkExpired" },
    (data) => {
      router.replace(data.next);
      router.refresh();
    },
  );
  return (
    <AuthCard title={c.resetUpdateTitle}>
      <StatusMessage status={status} online={online} />
      <form noValidate onSubmit={form.handleSubmit(submit)}>
        <Field
          form={form}
          name="password"
          label={c.newPasswordLabel}
          type="password"
          autoComplete="new-password"
          disabled={loading}
        />
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          loadingLabel={c.saving}
          disabledReason={online ? undefined : c.offline}
        >
          {c.saveNewPassword}
        </Button>
      </form>
    </AuthCard>
  );
}

export function LinkExpiredForm({
  type,
  action,
}: {
  type: ResendInput["type"];
  action: Action<ResendInput>;
}) {
  const form = useForm<ResendInput>({
    resolver: zodResolver(resendSchema),
    defaultValues: { email: "", type },
  });
  const { online, status, submit, loading } = useSubmit(
    action,
    type === "recovery" ? "resetSent" : "checkEmail",
    {},
  );
  const success = successCopy[status];
  return (
    <AuthCard title={type === "recovery" ? c.resetTitle : c.signUpTitle}>
      <StatusMessage status={status === "default" ? "linkExpired" : status} online={online} />
      {success ? (
        <p className="text-body">{success}</p>
      ) : (
        <form noValidate onSubmit={form.handleSubmit(submit)}>
          <Field
            form={form}
            name="email"
            label={c.emailLabel}
            type="email"
            autoComplete="email"
            disabled={loading}
          />
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel={c.sending}
            disabledReason={online ? undefined : c.offline}
          >
            {c.sendNewLink}
          </Button>
        </form>
      )}
      <p className="mt-6 text-small">
        <Link className="text-primary underline-offset-4 hover:underline" href="/sign-in">
          {c.backToSignIn}
        </Link>
      </p>
    </AuthCard>
  );
}
