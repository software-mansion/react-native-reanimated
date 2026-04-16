import React from 'react';
import { ImageResponse } from '@vercel/og';
import fs from 'fs';
import path from 'path';

/**
 * @param {string} _header
 * @param {string} base64Image
 */
export default async function OGImageStream(_header, base64Image) {
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
          position: 'relative',
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
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 1200,
          }}>
          <pre
            style={{
              fontSize: 32,
              color: 'white',
              fontWeight: 'normal',
              fontFamily: 'Aeonik Regular',
              textWrap: 'wrap',
            }}>
            Check out the React Native Worklets documentation.
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
