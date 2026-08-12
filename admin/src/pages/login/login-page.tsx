import { Anchor, Button, Card, Center, Container, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/shared/auth";
import { Wordmark } from "@/shared/ui";

const loginSchema = z.object({
  code: z.string().trim().min(5, "Код должен содержать минимум 5 символов"),
});

const devLoginSchema = z.object({
  phone: z.string().regex(/^\+998\d{9}$/, "Введите номер в формате +998XXXXXXXXX"),
});

export function LoginPage() {
  const { login, devLogin } = useAuth();
  const [pending, setPending] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const form = useForm({
    initialValues: { code: "", phone: "+998" },
    validate: (values) => {
      const result = (devMode ? devLoginSchema : loginSchema).safeParse(values);
      return result.success
        ? {}
        : Object.fromEntries(Object.entries(result.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0]]));
    },
  });
  return (
    <Center mih="100vh" p="md">
      <Container size={420} w="100%">
        <Card withBorder shadow="sm" p={{ base: "lg", sm: "xl" }}>
          <Stack gap="lg">
            <div>
              <Wordmark />
              <Title order={1} mt="md">Администрирование</Title>
              <Text c="dimmed" mt="xs">Введите единый код доступа администратора.</Text>
            </div>
            <form
              onSubmit={form.onSubmit(async (values) => {
                setPending(true);
                try {
                  if (devMode) await devLogin(values.phone);
                  else await login(values.code);
                } catch (error) {
                  notifications.show({
                    color: "red",
                    title: "Вход не выполнен",
                    message: error instanceof Error ? error.message : "Проверьте данные администратора",
                  });
                } finally {
                  setPending(false);
                }
              })}
            >
              <Stack>
                {devMode ? (
                  <TextInput label="Номер телефона" autoComplete="tel" inputMode="tel" {...form.getInputProps("phone")} />
                ) : (
                  <PasswordInput
                    label="Код доступа"
                    description="Минимум 5 символов"
                    autoComplete="current-password"
                    minLength={5}
                    autoFocus
                    {...form.getInputProps("code")}
                  />
                )}
                <Button type="submit" fullWidth loading={pending}>Войти</Button>
              </Stack>
            </form>
            {import.meta.env.DEV ? (
              <Anchor component="button" type="button" size="sm" onClick={() => setDevMode((value) => !value)}>
                {devMode ? "Использовать код доступа" : "Dev-only вход по телефону"}
              </Anchor>
            ) : null}
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}
