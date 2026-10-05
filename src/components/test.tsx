import styled from '@emotion/styled'

function test() {
  return (

    <Root>
        <Hero>
            <Logo></Logo>
            <Nav>
                <ul>
                    <li><a href="">Home</a></li>
                    <li><a href="">Product</a></li>
                    <li><a href="">Service</a></li>
                    <li><a href="">Contact</a></li>
                </ul>
            </Nav>
        </Hero>
        <Main></Main>
        <Footer>
            <ul>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
            </ul>
        </Footer>
    </Root>
   
  )
}

const Root = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 1400px;
    padding: 3rem 2rem;
    gap: 1rem;
`   

const Hero = styled.div`
    display: flex;
`

const Logo = styled.div`
    display: flex;
`

const Nav = styled.div`
    display: flex;
`

const Main = styled.div`
    display: flex;
`

const Footer = styled.div`
    display: flex;
`


export default test
