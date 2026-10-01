'use client'

import styled from '@emotion/styled'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}

function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  return (
    <Root role="radiogroup" aria-label={label}>
      {options.map(option => (
        <Option
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Option>
      ))}
    </Root>
  )
}

const Root = styled.div`
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.pill};
`

const Option = styled.button`
  padding: 0.375rem 0.875rem;
  border: 0;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &[aria-checked='true'] {
    background: ${({ theme }) => theme.colors.forest};
    color: ${({ theme }) => theme.colors.onForest};
  }
`

export default SegmentedControl
