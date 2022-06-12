import os
import sys
import argparse
import subprocess
import time
"""
    Open a folder of jpg images that are ordered in alphabetical order.
    Chain the images together into a video.
"""
def main():
    parser = argparse.ArgumentParser(description='Create a video from a folder of images.')
    parser.add_argument('-i', '--input', help='Input folder of images.', required=True)
    parser.add_argument('-o', '--output', help='Output video file.', required=True)
    parser.add_argument('-r', '--rate', help='Frame rate of video.', default=24)
    parser.add_argument('-s', '--size', help='Size of video.', default='1280x720')
    args = parser.parse_args()

    # Check if input folder exists
    if not os.path.isdir(args.input):
        print('Input folder does not exist.')
        sys.exit(1)

    # Check if output file exists
    if os.path.isfile(args.output):
        print('Output file already exists.')
        sys.exit(1)

    # Check if output file exists
    if not os.path.isdir(args.input):
        print('Input folder does not exist.')
        sys.exit(1)

    # Create list of images
    images = []
    for file in os.listdir(args.input):
        if file.endswith('.jpg'):
            images.append(os.path.join(args.input, file))

    # Sort list of images
    images.sort()

    # Create video
    command = ['ffmpeg', '-r', args.rate, '-f', 'image2', '-s', args.size, '-i', '%s', '-vcodec', 'libx264', '-crf', '25', '-pix_fmt', 'yuv420p', args.output]
    subprocess.run(command, input='\n'.join(images))

    # Check if video was created
    if not os.path.isfile(args.output):
        print('Video was not created.')
        sys.exit(1) 

if __name__ == "main":
    main()