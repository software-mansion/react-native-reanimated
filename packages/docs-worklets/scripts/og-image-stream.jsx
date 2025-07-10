import React from 'react';
import { ImageResponse } from '@vercel/og';
import fs from 'fs';
import path from 'path';

export default async function OGImageStream(header, base64Image) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 40,
          color: 'black',
          background: 'white',
          width: '100%',
          height: '100%',
          padding: '50px 200px',
          textAlign: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <img
          style={{
            width: 1200,
            height: 630,
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          src={base64Image}
          alt=""
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 1200,
            gap: -20,
            padding: '0 201px 0 67px',
          }}>
          <p
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#001A72',
              textAlign: 'left',
              fontFamily: 'Aeonik Bold',
              textWrap: 'wrap',
            }}>
            {header}
          </p>
          <pre
            style={{
              fontSize: 40,
              fontWeight: 'normal',
              color: '#001A72',
              textAlign: 'left',
              fontFamily: 'Aeonik Regular',
              textWrap: 'wrap',
            }}>
            {'Check out the React Native\nWorklets documentation.'}
          </pre>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Aeonik Bold',
          data: fs.readFileSync(
            path.resolve(__dirname, '../static/font/Aeonik-Bold.otf')
          ),
          style: 'normal',
        },
        {
          name: 'Aeonik Regular',
          data: fs.readFileSync(
            path.resolve(__dirname, '../static/font/Aeonik-Regular.otf')
          ),
          style: 'normal',
        },
      ],
    }
  ).body;
}
