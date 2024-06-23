
const Location = require('./models/Location');
const Boundary = require('./models/Boundary');
const turf = require('@turf/turf');


async function checkWorkArea(location, remote, udpServer) {
    try {
        // Get the boundary from MongoDB
        const boundaries = await Boundary.find().lean().exec();
        // check if location is within the boundary
        if (boundaries.length === 0) {
            console.log('No work area boundary found');
            return;
        }
        // define point and polygon
        const point = turf.point([location.longitude, location.latitude]);
        for (let boundary of boundaries) {
            if (boundary.properties.alarmType == 'outsideBoundary') {
                // make sure boundary is a valid polygon
                if (boundary.geometry.coordinates.length < 3) {
                    console.log('Invalid work area boundary');
                    return boundary;
                }
                // make sure the polygon is closed
                if (boundary.geometry.coordinates[0][0] != boundary.geometry.coordinates[boundary.geometry.coordinates.length - 1][0] ||
                    boundary.geometry.coordinates[0][1] != boundary.geometry.coordinates[boundary.geometry.coordinates.length - 1][1]) {
                    boundary.geometry.coordinates.push(boundary.geometry.coordinates[0]);
                }
                const polygon = turf.polygon([boundary.geometry.coordinates]);

                const isInside = turf.booleanPointInPolygon(point, polygon);
                // send UDP response back to remote
                if (!isInside) {
                    const response = Buffer.from([0xBB, 0xBB, 0x01, remote.address.split('.').map(Number), 0xFF, 0xFF]);
                    await udpServer.send(response, 0, response.length, remote.port, remote.address, function (err) {
                        if (err) {
                            console.log('Error sending UDP response: ' + err);
                        }
                    });
                    break;
                }
            } else if (boundary.properties.alarmType == 'nearBoundary') {
                if (boundary.properties.alarmDistance) {
                    const line = turf.lineString(boundary.geometry.coordinates);
                    const distance = turf.pointToLineDistance(point, line, { units: 'meters' })*1000;
                    console.log('Distance to work area: ' + distance + ' milimeters');
                    if (distance < boundary.properties.alarmDistance) {
                        const response = Buffer.from([0xBB, 0xBB, 0x01, remote.address.split('.').map(Number), 0xFF, 0xFF]);
                        await udpServer.send(response, 0, response.length, remote.port, remote.address, function (err) {
                            if (err) {
                                console.log('Error sending UDP response: ' + err);
                            }
                        });
                        break;
                    }
                }
            }
        }
    } catch (error) {
        console.log('Error checking work area: ' + error);
    }

}

module.exports = {
    checkWorkArea
}