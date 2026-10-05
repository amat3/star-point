'use client'

import styled from '@emotion/styled'

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  // Stretch over the whole width, options sharing it equally
  fill?: boolean
}

function SegmentedControl<T extends string>({ options, value, onChange, label, fill = false }: SegmentedControlProps<T>) {
  return (
    <Root role="radiogroup" aria-label={label} $fill={fill}>
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

const Root = styled('div', {
  shouldForwardProp: (prop) => prop !== '$fill',
})<{ $fill: boolean }>`
  display: ${({ $fill }) => ($fill ? 'flex' : 'inline-flex')};
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surface};
`

const Option = styled.button`
  flex: 1 1 auto;
  text-align: center;
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
