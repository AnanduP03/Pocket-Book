"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError, FormField } from "@/components/ui/form-field";
import { signupAction } from "./actions";
import { signupInputSchema, type SignupInput } from "./schema";

export function SignupForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupInputSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupInput) {
    setSubmitting(true);
    const res = await signupAction(values);
    if (!res.ok) {
      if (res.error.field) {
        form.setError(res.error.field as keyof SignupInput, {
          message: res.error.message,
        });
      } else {
        form.setError("root", { message: res.error.message });
      }
      setSubmitting(false);
      return;
    }
    const signInRes = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setSubmitting(false);
    if (!signInRes || signInRes.error) {
      form.setError("root", {
        message: "Account created but sign-in failed. Try signing in.",
      });
      router.replace("/auth/login");
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <FormField>
        <Label htmlFor="signup-name">Name</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          autoFocus
          placeholder="Jane Doe"
          {...form.register("name")}
          aria-invalid={Boolean(form.formState.errors.name)}
        />
        <FormError message={form.formState.errors.name?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...form.register("email")}
          aria-invalid={Boolean(form.formState.errors.email)}
        />
        <FormError message={form.formState.errors.email?.message} />
      </FormField>

      <FormField>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...form.register("password")}
          aria-invalid={Boolean(form.formState.errors.password)}
        />
        <FormError message={form.formState.errors.password?.message} />
      </FormField>

      <FormError message={form.formState.errors.root?.message} />

      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
