/*
    Copyright 2019 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
    https://soltecsis.com
    info@soltecsis.com


    This file is part of FWCloud (https://fwcloud.net).

    FWCloud is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    FWCloud is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/


/*

 Copyright (C) 2015 ribrdb @ code.google.com

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/
PR.registerLangHandler(PR.createSimpleLexer([["pun",/^[:|>?]+/,null,":|>?"],["dec",/^%(?:YAML|TAG)[^#\r\n]+/,null,"%"],["typ",/^[&]\S+/,null,"&"],["typ",/^!\S*/,null,"!"],["str",/^"(?:[^\\"]|\\.)*(?:"|$)/,null,'"'],["str",/^'(?:[^']|'')*(?:'|$)/,null,"'"],["com",/^#[^\r\n]*/,null,"#"],["pln",/^\s+/,null," \t\r\n"]],[["dec",/^(?:---|\.\.\.)(?:[\r\n]|$)/],["pun",/^-/],["kwd",/^[\w-]+:[ \r\n]/],["pln",
/^\w+/]]),["yaml","yml"]);
