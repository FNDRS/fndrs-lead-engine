"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createLead } from "@/services/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function CreateLeadDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    businessName: "",
    website: "",
    category: "",
    city: "",
  })

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead created")
      setOpen(false)
      setForm({ businessName: "", website: "", category: "", city: "" })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.businessName.trim()) return toast.error("Business name is required")
    mutation.mutate({
      businessName: form.businessName,
      website: form.website || undefined,
      category: form.category || undefined,
      city: form.city || undefined,
    })
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <>
      <Button
        size="sm"
        className="gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        New Lead
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Create Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Business Name *</Label>
              <Input
                placeholder="Acme Corp"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                {...field("businessName")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Website</Label>
              <Input
                placeholder="https://example.com"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                {...field("website")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Category</Label>
                <Input
                  placeholder="Restaurant"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  {...field("category")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">City</Label>
                <Input
                  placeholder="New York"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  {...field("city")}
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-zinc-400 hover:text-zinc-100"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
