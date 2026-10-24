"use client";

import { ArrowUpRight, ChevronsUpDown, LogOut } from "lucide-react";
import Link from "next/link";
import { startTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "../auth-actions";

type UserMenuProps = {
  user: { name: string; email: string };
  /** Just the avatar, for the narrow header on small screens. */
  compact?: boolean;
};

export function UserMenu({ user, compact }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={compact ? `Account: ${user.name}` : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          compact
            ? "rounded-full"
            : "w-full p-1.5 transition-colors hover:bg-foreground/5 aria-expanded:bg-foreground/5",
        )}
      >
        <Avatar name={user.name} />
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{user.name}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={compact ? "bottom" : "top"}
        align={compact ? "end" : "start"}
        className={compact ? "w-56" : undefined}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/" />}>
            <ArrowUpRight />
            View site
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => startTransition(signOut)}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
