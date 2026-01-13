import { AlertTriangle, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  entityName?: string
  cascadeWarning?: {
    items: Array<{ type: string; count: number }>
  }
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  isLoading?: boolean
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  entityName,
  cascadeWarning,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  isLoading = false,
}: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {entityName && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm font-medium">{entityName}</p>
            </div>
          )}
        </DialogHeader>

        {cascadeWarning && cascadeWarning.items.length > 0 && (
          <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-r-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  This will also delete:
                </p>
                <ul className="mt-1 text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  {cascadeWarning.items.map((item, idx) => (
                    <li key={idx}>
                      {item.count} {item.type}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
