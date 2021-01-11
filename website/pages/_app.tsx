import { DokzProvider, GithubLink, ColorModeSwitch } from 'dokz/src'
import React, { Fragment } from 'react'
import Head from 'next/head'

import { Box, ChakraProvider } from '@chakra-ui/react'

export default function App(props) {
    const { Component, pageProps } = props
    return (
        <Fragment>
            <Head>
                <title>Bundless</title>
                <link
                    href='https://fonts.googleapis.com/css?family=Fira+Code'
                    rel='stylesheet'
                    key='google-font-Fira'
                />
            </Head>
            <ChakraProvider resetCSS>
                <DokzProvider
                    initialColorMode='dark'
                    docsRootPath='pages/docs'
                    headerLogo={
                        <a href='/'>
                            <Box fontSize='1.4em' fontWeight='600'>
                                Bundless
                            </Box>
                        </a>
                    }
                    headerItems={[
                        <GithubLink
                            key='0'
                            url='https://github.com/remorses/dokz'
                        />,
                        <ColorModeSwitch key='1' />,
                    ]}
                    sidebarOrdering={{
                        docs: {
                            'index.mdx': true,
                            'config.mdx': true,
                            'writing-experiments': true,
                            'dark-mode': true,
                            deploy: true,
                        },
                    }}
                >
                    <Component {...pageProps} />
                </DokzProvider>
            </ChakraProvider>
        </Fragment>
    )
}
