# Simulates a person walking to draw a boundary on the map.
# The person walks from location to location to draw a rectangle.
import socket
import asyncio
from datetime import datetime

server_address = ('localhost', 8001)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def DDtoDMS(lat,long):
    # convert decimal degrees to degrees, minutes and seconds
    lat_abs = abs(lat)
    lat_deg = int(lat_abs)
    lat_min = (lat_abs - lat_deg) * 60
    lat_dir = 'S' if lat < 0 else 'N'

    long_abs = abs(long)
    long_deg = int(long_abs)
    long_min = (long_abs - long_deg) * 60
    long_dir = 'W' if long < 0 else 'E'

    return f'{lat_deg:02.0f}{lat_min:02.5f},{lat_dir},{long_deg:03.0f}{long_min:02.5f},{long_dir}'

async def PointToPointMove(msg, location1, location2, steps):
    for i in range(steps):
        latitude = location1[0] + (location2[0] - location1[0]) * (i/steps)
        longitude = location1[1] + (location2[1] - location1[1]) * (i/steps)

        locationStr = DDtoDMS(latitude, longitude)
        location = f'{msg},{locationStr},5,11'.encode()
        sock.sendto(location, server_address)
        print(f'Sent: {location}')
        await asyncio.sleep(1)

async def DrawBoundary(id):
    # Change the locations to draw a different boundary
    locations = [
        (-36.848000, 174.761663),
        (-36.848253, 174.762596),
        (-36.850086, 174.761770),
        (-36.849798, 174.760858),
        (-36.848304, 174.761679)]
    for i in range(len(locations)-1):
        await PointToPointMove(f'$B,{id},1,$GNGGA,030021.00', locations[i], locations[i+1], i+1)

    # change device from boundary mode to point mode to close of boundary
    location = f'$P,{id},1,$GNGGA,030021.00,{DDtoDMS(locations[0][0], locations[0][1])},5,11'.encode()
    sock.sendto(location, server_address)
    print(f'Sent: {location}')
    await asyncio.sleep(1)

async def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    # $B,4,1,$GNGGA,030021.00,3654.99784,S,17454.01438,E,4,11
    task1 = asyncio.create_task(DrawBoundary(1))
    await task1

if __name__ == '__main__':
    asyncio.run(main())