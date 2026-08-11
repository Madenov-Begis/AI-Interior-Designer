import { AppShell, Avatar, Group, NavLink, Text } from "@mantine/core";
import {
  IconChartBar,
  IconCoin,
  IconFileText,
  IconPhoto,
  IconUsers,
} from "@tabler/icons-react";
import { NavLink as RouterLink, Outlet, useLocation } from "react-router-dom";
import { RuvieLogo } from "../shared/brand";

const nav = [
  ["/", "Обзор", IconChartBar],
  ["/users", "Пользователи", IconUsers],
  ["/generations", "Генерации", IconPhoto],
  ["/finance", "Финансы", IconCoin],
  ["/plans", "Тарифы", IconFileText],
] as const;

export function AdminShell({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 260, breakpoint: 0 }}
      padding="xl"
      styles={{ main: { background: "#19191b", minHeight: "100vh" } }}
    >
      <AppShell.Header bg="#111113" withBorder>
        <Group justify="space-between" h="100%" px="xl">
          <Group gap="sm">
            <RuvieLogo />
            <Text c="dimmed" size="sm">
              Администрирование
            </Text>
          </Group>
          <Group>
            <Avatar color="ruvie" radius="xl">
              A
            </Avatar>
            <Text
              size="sm"
              c="dimmed"
              style={{ cursor: "pointer" }}
              onClick={onLogout}
            >
              Выйти
            </Text>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" bg="#111113">
        <AppShell.Section>
          <Text size="xs" tt="uppercase" c="dimmed" fw={800} px="sm" mb="sm">
            Система
          </Text>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              component={RouterLink}
              to={to}
              label={label}
              leftSection={<Icon size={18} />}
              active={
                to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(to)
              }
              color="ruvie"
              variant="filled"
              mb={4}
            />
          ))}
        </AppShell.Section>
        <AppShell.Section grow />
        <AppShell.Section>
          <Text size="xs" c="dimmed" px="sm">
            Локальная desktop-версия
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
