'use client'

import { useState } from 'react'
import styled from '@emotion/styled'
import { Eye, EyeOff } from 'lucide-react'
import Input from '../atoms/Input'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Root>
      <Field {...props} type={visible ? 'text' : 'password'} />
      <Toggle
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Toggle>
    </Root>
  )
}

const Root = styled.div`
  position: relative;
`

const Field = styled(Input)`
  padding-right: 2.75rem;
`

const Toggle = styled.button`
  position: absolute;
  top: 50%;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.muted};
  transform: translateY(-50%);
  cursor: pointer;

  svg {
    width: 1rem;
    height: 1rem;
  }
`

export default PasswordInput
