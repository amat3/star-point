'use client'

import styled from '@emotion/styled'
import Label from '../atoms/Label'

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: React.ReactNode
}

// Label + control + hint/error, the unit every form is made of.
function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <Root>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <Message role="alert" $error>{error}</Message> : hint ? <Message>{hint}</Message> : null}
    </Root>
  )
}

const Root = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Message = styled('p', {
  shouldForwardProp: (prop) => prop !== '$error',
})<{ $error?: boolean }>`
  margin: 0;
  color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.muted)};
  font-size: 0.75rem;
`

export default Field
