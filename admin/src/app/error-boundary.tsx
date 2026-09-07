import {
  Alert,
  Button,
  Center,
  Container,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { captureException } from "@sentry/react";
import { Component, type ErrorInfo, type ReactNode } from "react";

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureException(error);
    console.error("Admin render error", {
      name: error.name,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Center mih="100vh" p="md">
        <Container size="sm">
          <Alert color="red" icon={<IconAlertTriangle />}>
            <Stack>
              <Title order={2}>Экран не удалось отобразить</Title>
              <Text>
                Данные не потеряны. Обновите экран или вернитесь на главную.
              </Text>
              <Button onClick={() => window.location.assign("/")}>
                Вернуться на главную
              </Button>
            </Stack>
          </Alert>
        </Container>
      </Center>
    );
  }
}
