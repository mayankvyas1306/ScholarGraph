function ProgressTracker({ steps = [], currentStep = 0 }) {
  return (
    <div aria-label="Research progress">
      {steps.map((step, index) => {
        const completed = index < currentStep
        const active = index === currentStep

        return (
          <div key={step.id ?? index}>
            <span>
              {completed ? '✓' : index + 1}
            </span>

            <span>
              {step.label ?? step}
            </span>

            {active && <span>In progress</span>}
          </div>
        )
      })}
    </div>
  )
}

export default ProgressTracker
