import styled from '@emotion/styled'

function Logo() {
  return (
    <Root>
      <LogoWrapper>
        <IntWrapper />
      </LogoWrapper>
      <Name>starpoint</Name>
    </Root>
  )
}

const Root = styled.div`
  display: flex;
  align-items: center;
  gap: .625rem;
`

const LogoWrapper = styled.div`
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.forest};
  transform: rotate(-7deg);
`

const IntWrapper = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.lime};
`

const Name = styled.span`
  color: ${({ theme }) => theme.colors.forest};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.8px;
`

export default Logo
