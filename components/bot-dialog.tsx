"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon, Trash2Icon } from "lucide-react"
import { nanoid } from "nanoid"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { ChatAvatar } from "@/components/chat-avatar"
import { createBot, deleteBot, updateBot } from "@/actions/bot"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { botFormSchema, type BotFormValues } from "@/db/validation"

const JOB_PRESETS = [
  "Research assistant",
  "Code reviewer",
  "Writing editor",
  "Tutor",
] as const

function emptyBotForm(): BotFormValues {
  return { avatar: nanoid(), name: "", job: "", instructions: "" }
}

export function BotDialog({
  children,
  open: openProp,
  onOpenChange,
  bot,
}: {
  // Uncontrolled: pass a trigger element. Controlled: pass open + onOpenChange.
  children?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Present: edit this bot. Absent: create a new one.
  bot?: BotFormValues & { id: string }
}) {
  const isEdit = bot !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen

  const form = useForm<BotFormValues>({
    resolver: zodResolver(botFormSchema),
    defaultValues: bot
      ? {
          avatar: bot.avatar,
          name: bot.name,
          job: bot.job,
          instructions: bot.instructions,
        }
      : emptyBotForm(),
  })
  const avatar = form.watch("avatar")
  const { isSubmitting, errors } = form.formState

  // Every close path (submit, cancel, Esc, overlay) funnels through here so the
  // form never carries stale values into the next open.
  function handleOpenChange(next: boolean) {
    if (!isControlled) {
      setInternalOpen(next)
    }
    onOpenChange?.(next)
    if (!next) {
      form.reset(bot ? { ...bot } : emptyBotForm())
    }
  }

  function shuffle() {
    form.setValue("avatar", nanoid())
  }

  async function onSubmit(values: BotFormValues) {
    const result = bot
      ? await updateBot({ ...values, id: bot.id })
      : await createBot(values)
    if (!result.success) {
      toast.add({
        title: isEdit ? "Could not update bot" : "Could not create bot",
        description: result.error,
      })
      return
    }
    toast.add(
      isEdit
        ? { title: "Bot updated", description: `${values.name} is saved.` }
        : { title: "Bot created", description: `${values.name} is ready.` }
    )
    handleOpenChange(false)
  }

  async function onDelete() {
    if (!bot) {
      return
    }
    const result = await deleteBot(bot.id)
    if (!result.success) {
      toast.add({ title: "Could not delete bot", description: result.error })
      return
    }
    toast.add({ title: "Bot deleted", description: `${bot.name} is gone.` })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger render={children} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit bot" : "New bot"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change its face, name, or how it works."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="flex flex-wrap gap-2">
              {JOB_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    form.setValue("job", preset, { shouldValidate: true })
                  }
                >
                  {preset}
                </Button>
              ))}
            </div>
            <Field orientation="horizontal">
              <ChatAvatar seed={avatar ?? ""} className="size-10 rounded-full" />
              <FieldContent>
                <FieldLabel htmlFor="bot-avatar">Face</FieldLabel>
                <FieldDescription>
                  Shuffle until you find one you like.
                </FieldDescription>
              </FieldContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={shuffle}
              >
                <ShuffleIcon data-icon="inline-start" />
                Shuffle
              </Button>
            </Field>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                id="bot-name"
                placeholder="Ada"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
              {errors.name?.message ? (
                <FieldError>{errors.name.message}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={!!errors.job}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                id="bot-job"
                placeholder="Research assistant"
                aria-invalid={!!errors.job}
                {...form.register("job")}
              />
              {errors.job?.message ? (
                <FieldError>{errors.job.message}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={!!errors.instructions}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                id="bot-instructions"
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                rows={4}
                aria-invalid={!!errors.instructions}
                {...form.register("instructions")}
              />
              {errors.instructions?.message ? (
                <FieldError>{errors.instructions.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          <DialogFooter>
            {isEdit ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      className="sm:mr-auto"
                    />
                  }
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete bot
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the bot and its chats. It cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={isSubmitting}
                      onClick={onDelete}
                    >
                      {isSubmitting ? (
                        <Spinner data-icon="inline-start" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
              {isEdit ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
