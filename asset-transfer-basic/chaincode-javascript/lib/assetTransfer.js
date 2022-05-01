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
        await ctx.stub.putState(this.asset, Buffer.from(stringify(sortKeysRecursive(flightNrs))));
    }


    async getFlight(ctx, id){
        let flight = await ctx.stub.getState(id);
        if(!(flight && typeof flight == typeof {} && flight.length > 0)){
            throw new Error(`flight with id ` + id + ` doesn't exist`);
        }
        return flight.toString();
    }

    async getReservation(ctx, id){
        let reservation = await ctx.stub.getState(id);
        if(!(reservation && typeof reservation == typeof {} && reservation.length > 0)){
            throw new Error(`Reservation with id ` + id + ` doesn't exist`);
        }
        return reservation.toString();
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
        let flight = await ctx.stub.getState(flightNr);
        
        if(!flight){
            throw new Error(`flight with id ` + flightNr + ` doesn't exist`);
        }

        if(flight.availablePlaces < number){
            throw new Error(`not enough available seats for flight number ` + id);
        }

        //TODO add customerNames to the reservation
        let reservationId = 'R' + reservationNumber++;
        let asset = {
            reservationNr: reservationId,
            customerNames: [],
            customerEmail: '',
            flightNr: flightNr,
            nrOfSeats: number,
            status: 'Pending'
        }

        await ctx.stub.putState(reservationId, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
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

        const asset = {
            flightNr: id,
            flyFrom: flyFrom,
            flyTo: flyTo,
            dateTime: dateTime,
            availablePlaces: seats,
        };

        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    async bookSeats(ctx, reservationNr, company){
        // TODO org check

        let reservation = JSON.parse(await this.getReservation(ctx, reservationNr));
        if(!reservation.flightNr.startsWith(company)){
            throw new Error(`Your company is not able to book.`);
        }
        if(reservation.status != 'Pending'){
            throw new Error(`This reservation is not avaible to book, the status is ${reservation.status}`);
        }
        let flight = JSON.parse(await this.getFlight(ctx, reservation.flightNr));
        if(flight.availablePlaces >= reservation.nrOfSeats){
            reservation.status = "Complete";
            flight.availablePlaces -= reservation.nrOfSeats;
            await ctx.stub.putState(flight.flightNr, Buffer.from(stringify(sortKeysRecursive(flight))));
            await ctx.stub.putState(reservationNr, Buffer.from(stringify(sortKeysRecursive(reservation))));
            return this.getReservation(ctx, reservationNr);
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