import { Plus, MessageSquareText, Flag, Palmtree, Sparkles, Flame, Trash, MoveHorizontal } from 'lucide-react'
import { OnboardingSlide } from './types'

export const WelcomeSlide = () => (
  <div className="space-y-4 text-center">
    <p className="text-lg text-muted-foreground">
      Let's show you around! This quick tour will help you get started with managing your projects and team schedules.
    </p>
    <p className="text-sm text-muted-foreground">
      You can always access this tutorial again by clicking the <strong>?</strong> button in the header.
    </p>
  </div>
)

export const AssignmentsSlide = () => (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      Assignments are the core of ovos Sprint. Here's how to create them:
    </p>
    <ul className="space-y-3 text-sm text-muted-foreground">
      <li className="flex items-start gap-3">
        <span className="text-primary font-bold">1.</span>
        <span>Go to the Timeline view and select <strong>"By Project"</strong> or <strong>"By Member"</strong> mode</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="text-primary font-bold">2.</span>
        <span>Click on a date cell to create a single day assignment</span>
      </li>
      <li className="flex items-start gap-3">
        <span className="text-primary font-bold">3.</span>
        <span>Drag across multiple dates to create a range of assignments</span>
      </li>
    </ul>
  </div>
)

export const ModifyingAssignmentsSlide = () => (
  <div className="space-y-6">
    <p className="text-muted-foreground">
      You can modify assignments in the following ways:
    </p>
    {/* Deleting */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Trash className="h-5 w-5 text-primary" />
        <span>Deleting Assignments</span>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground ml-7">
        <li>• Right-click or CTRL/CMD+click on an existing assignment to delete it</li>
        <li>• Right-click or CTRL/CMD+click while dragging to delete multiple assignments at once</li>
      </ul>
    </div>

    {/* Moving */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <MoveHorizontal className="h-5 w-5 text-primary" />
        <span>Moving Assignments</span>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground ml-7">
        <li>• ALT+click on an existing assignment and drag horizontally to move it across days</li>
      </ul>
    </div>
  </div>
)

export const MilestonesAndDaysOffSlide = () => (
  <div className="space-y-6">
    {/* Milestones */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Flag className="h-5 w-5 text-primary" />
        <span>Adding Milestones</span>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground ml-7">
        <li>• In <strong>"By Project"</strong> view, expand a project row</li>
        <li>• Click on any date in the project header row (not member rows)</li>
        <li>• A milestone indicator (flag icon) will appear on that date</li>
        <li>• Click again to remove the milestone</li>
      </ul>
    </div>

    {/* Days Off */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Palmtree className="h-5 w-5 text-primary" />
        <span>Managing Days Off</span>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground ml-7">
        <li>• Switch to <strong>"By Member"</strong> view in the Timeline</li>
        <li>• Click on any date in a team member's header row</li>
        <li>• The date will be marked as vacation/day-off</li>
        <li>• Right-click on a marked date to remove the day-off</li>
      </ul>
    </div>
  </div>
)

export const CommentsAndPrioritySlide = () => (
  <div className="space-y-6">
    {/* Comments */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <MessageSquareText className="h-5 w-5 text-primary" />
        <span>Adding Comments</span>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground ml-7">
        <li>• Click on any assignment cell in the Timeline</li>
        <li>• A dialog will open where you can add or edit comments</li>
        <li>• Comments are visible when hovering over assignments</li>
        <li>• Use comments to add notes, context, or reminders</li>
      </ul>
    </div>

    {/* Priority */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Flame className="h-5 w-5 text-primary" />
        <span>Assignment Priority</span>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground ml-7">
        <li>• Click on any assignment to set priority (High/Normal/Low)</li>
        <li>• High priority assignments are highlighted with a distinct color</li>
        <li>• Assignments spanning multiple days are grouped automatically</li>
        <li>• Priority levels help visualize workload importance</li>
      </ul>
    </div>
  </div>
)

export const CompletionSlide = () => (
  <div className="space-y-4 text-center">
    <p className="text-lg text-muted-foreground">
      You now know the basics of ovos Sprint!
    </p>
    <p className="text-sm text-muted-foreground">
      Remember, you can always reopen this tutorial by clicking the <strong>?</strong> button in the header.
    </p>
    <div className="pt-4 text-sm text-muted-foreground border-t">
      <p>Happy sprinting! 🏃‍♂️‍➡️</p>
    </div>
  </div>
)

export const onboardingSlides: OnboardingSlide[] = [
  {
    title: 'Welcome to ovos Sprint! 🏃‍♂️‍➡️',
    icon: <Sparkles className="h-12 w-12 text-primary" />,
    content: <WelcomeSlide />,
  },
  {
    title: 'Creating Assignments',
    icon: <Plus className="h-12 w-12 text-primary" />,
    content: <AssignmentsSlide />,
  },
  {
    title: 'Modifying Assignments',
    icon: (
      <div className="flex gap-2">
        <Trash className="h-10 w-10 text-primary" />
        <MoveHorizontal className="h-10 w-10 text-primary" />
      </div>
    ),
    content: <ModifyingAssignmentsSlide />,
  },
  {
    title: 'Comments & Priority',
    icon: (
      <div className="flex gap-2">
        <MessageSquareText className="h-10 w-10 text-primary" />
        <Flame className="h-10 w-10 text-primary" />
      </div>
    ),
    content: <CommentsAndPrioritySlide />,
  },
  {
    title: 'Milestones & Days Off',
    icon: (
      <div className="flex gap-2">
        <Flag className="h-10 w-10 text-primary" />
        <Palmtree className="h-10 w-10 text-primary" />
      </div>
    ),
    content: <MilestonesAndDaysOffSlide />,
  },
  {
    title: "You're All Set! 🎉",
    icon: <Sparkles className="h-12 w-12 text-primary" />,
    content: <CompletionSlide />,
  },
]
