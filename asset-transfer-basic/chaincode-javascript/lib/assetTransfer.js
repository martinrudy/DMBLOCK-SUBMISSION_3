/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
var bsid = 0;
var ecid = 0;
var reservationNumber = 0;
class FlightManager extends Contract {

    async InitLedger(ctx) {
        const flightNrs = {}
        await ctx.stub.putState(this.flight, Buffer.from(stringify(sortKeysRecursive(flightNrs))));
    }

    /*async InitLedger(ctx) {
        //reservationNumber = 0;
        const flights = [
            {
                flightNr: 'EC001',
                flyFrom: 'BUD',
                flyTo: 'TXL',
                dateTime: '05032021-1034',
                availablePlaces: 100,
            },
            {
                flightNr: 'BS015',
                flyFrom: 'MUC',
                flyTo: 'LIS',
                dateTime: '10042021-2157',
                availablePlaces: 150,
            },
        ];

        for (const flight of flights) {
            //flight.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(flight.flightNr, Buffer.from(stringify(sortKeysRecursive(flight))));
        }
    }*/


    async getFlight(ctx, id){
        let flight = await ctx.stub.getState(id);
        if(!flight){
            throw new Error(`flight with id ` + id + ` doesn't exist`);
        }
        return flight.toString();
    }

    async getReservation(ctx, id){
        let flight = await ctx.stub.getState(id);
        if(!flight){
            throw new Error(`flight with id ` + id + ` doesn't exist`);
        }
        return flight.toString();
    }


    async checkIn(ctx, reservationNr, passportIDs){
        // passportIDs expected as array of objects
        // for exmaple: [{cusName: 'Viki Košte', passport: 'OP123456'}, {cusName: 'Kiko Mastičkár', passport: 'OP654321'}]

        // TODO callable only by Travel agency or final customer

        let reservation = await ctx.stub.getState(reservationNr);

        if(!reservation){
            throw new Error(`reservation with id ` + reservationNr + ` doesn't exist`);
        }

        reservation['customerNames'].forEach(passenger =>{
            //if passenger doesnt have reservation, throw error
            if(!passportIDs.find(o => o.cusName === passenger)){
                throw new Error(`no passenger named ` + o.cusName + ` in reservation number ` + reservationNr);
            }
        });

        reservation[status] = 'Checked-In';
        return await ctx.stub.putState(reservationNr, Buffer.from(stringify(sortKeysRecursive(reservation))));
    }


    async reserveSeats(ctx, flightNr, number) {
        // TODO org check
        //const id = await this.genFlightNr('BS');

        /*if (!id || id.length === 0)
            throw new Error(`Wrong generated ID`);
        */
        const flight = {
            reservationNr: 'R99',
            customerNames: 'Viki Koste',
            customerEmail: 'picus@pojebany.com',
            flightNr: 'tvoj kokot',
            nrOfSeats: 9,
            status: 'Pending'
        };

        await ctx.stub.putState('R99', Buffer.from(stringify(sortKeysRecursive(flight))));
        return JSON.stringify(flight);
    }


    async genFlightNr(company){
        let id;
        if(company === 'BS'){
            id = bsid;
            bsid += 1;
            return 'BS'+id
        }
        else if(company === 'EC'){
            id = ecid;
            ecid += 1;
            return 'EC'+id
        }
        return 0;
    }

    // createFlight create a new flight to the world state with given details.
    async createFlight(ctx, flyFrom, flyTo, dateTime, seats) {
        // TODO org check
        const id = await this.genFlightNr('BS');

        if (!id || id.length === 0)
            throw new Error(`Wrong generated ID`);

        const flight = {
            flightNr: id,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTime: dateTime,
            availablePlaces: seats,
        };

        /*const reservation = {
            reservationNr: 'R88',
            customerNames: 'Viki Koste',
            customerEmail: 'picus@pojebany.com',
            flightNr: 'tvoj kokot',
            nrOfSeats: 9,
            status: 'Pending'
        };

        await ctx.stub.putState('R88', Buffer.from(stringify(sortKeysRecursive(reservation))));
        */
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(flight))));

       
        return JSON.stringify(flight);
    }

    async bookSeats(ctx, reservationNr){
        // TODO org check

        let reservation = await ctx.stub.getState(reservationNr);

        if(!(typeof reservation == typeof {} && reservation)){
        //if (!reservation) {
            throw new Error(`The reservation ${reservationNr} does not exist`);
        }
        let flight = await this.getFlight(ctx, reservation.flightNr);
        if (!(typeof flight == typeof {} && flight)) {
            throw new Error(`The flight ${reservation.flightNr} does not exist`);
        }
        if(reservation.flightNr.slice(0, 1) === company && flight.availablePlaces >= reservation.nrOfSeats){
            reservation.status = "complete";
            flight.availablePlaces -= reservation.nrOfSeats;
            await ctx.stub.putState(flight.flightNr, Buffer.from(stringify(sortKeysRecursive(flight))));
            return ctx.stub.putState(reservationNr, Buffer.from(stringify(sortKeysRecursive(reservation))));
        }
        else{
            throw new Error(`Not enought seats to reserve.`);
        }


    }


    // getAllFlights returns all flights of all Airlines, inspirated by asset-transfer-basic.
    async getAllFlights(ctx) {
        const allFlights = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allFlights.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allFlights);
    }
}

module.exports = FlightManager;
